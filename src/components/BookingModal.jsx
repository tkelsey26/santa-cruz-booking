import { useState } from 'react'
import { validateBooking, countNights, formatDisplayDate, formatDate, getQuotaInfo } from '../lib/bookingRules'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function BookingModal({ checkIn, checkOut, allUsers, existingBookings, onClose, onSuccess }) {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [notes, setNotes] = useState('')
  const [adminOverride, setAdminOverride] = useState(false)
  const [bookingFor, setBookingFor] = useState(user.id)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const nights = countNights(checkIn, checkOut)
  const targetUser = allUsers?.find(u => u.id === bookingFor)
  const targetRole = adminOverride ? 'admin' : (targetUser?.role ?? profile?.role)
  const targetBookings = existingBookings.filter(b => b.user_id === bookingFor)
  const validation = adminOverride ? { valid: true } : validateBooking(checkIn, checkOut, targetRole, targetBookings)
  const quota = getQuotaInfo(checkIn, targetRole, targetBookings)

  async function handleSubmit() {
    if (!validation.valid) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.from('bookings').insert({
      user_id: bookingFor,
      check_in: formatDate(checkIn),
      check_out: formatDate(checkOut),
      notes: notes.trim() || null,
      admin_override: adminOverride,
      status: isAdmin ? 'approved' : 'pending',
    })
    setSubmitting(false)
    if (err) setError(err.message)
    else onSuccess()
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isAdmin ? 'Create a Booking' : 'Request a Stay'}</DialogTitle>
        </DialogHeader>

        {/* Date summary */}
        <div className="rounded-lg bg-sea-50 border border-sea-100 p-4 mb-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-sea-500 uppercase tracking-wide font-medium mb-0.5">Check-in</p>
            <p className="font-semibold text-slate-800 text-sm">{formatDisplayDate(checkIn)}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-sea-600">{nights}</p>
            <p className="text-xs text-slate-400">night{nights !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-sea-500 uppercase tracking-wide font-medium mb-0.5">Check-out</p>
            <p className="font-semibold text-slate-800 text-sm">{formatDisplayDate(checkOut)}</p>
          </div>
        </div>

        {/* Admin: book for a specific guest */}
        {isAdmin && allUsers && (
          <div className="mb-4">
            <Label className="mb-1.5 block">Booking for</Label>
            <Select value={bookingFor} onValueChange={setBookingFor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email} — {u.role.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quota info */}
        {!quota.unlimited && !adminOverride && (
          <div className="mb-4 rounded-lg bg-sea-50 border border-sea-100 px-4 py-2.5 text-xs text-sea-700">
            <span className="font-semibold capitalize">{quota.season} quota:</span>{' '}
            {quota.remaining} of {quota.total} nights remaining
            {quota.used > 0 && ` (${quota.used} used)`}
          </div>
        )}

        {/* Rule violation */}
        {!adminOverride && !validation.valid && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-100 px-4 py-2.5 text-sm text-rose-700">
            {validation.reason}
          </div>
        )}

        {/* Admin override */}
        {isAdmin && (
          <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={adminOverride}
              onChange={e => setAdminOverride(e.target.checked)}
              className="rounded border-slate-300 text-sea-500"
            />
            <span className="text-sm text-slate-700">Override booking rules</span>
            {adminOverride && <Badge variant="admin">Active</Badge>}
          </label>
        )}

        {/* Notes */}
        <div className="mb-5">
          <Label className="mb-1.5 block">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any special requests…"
          />
        </div>

        {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!validation.valid || submitting}
          >
            {submitting ? 'Saving…' : isAdmin ? 'Book Now' : 'Submit Request'}
          </Button>
        </div>

        {!isAdmin && (
          <p className="text-xs text-slate-400 text-center mt-3">
            Your request will be reviewed and approved by an admin.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
