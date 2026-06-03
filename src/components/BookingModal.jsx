import { useState } from 'react'
import { validateBooking, countNights, formatDisplayDate, formatDate, getQuotaInfo } from '../lib/bookingRules'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
      // Admins booking directly are auto-approved; regular guests go to pending
      status: isAdmin ? 'approved' : 'pending',
    })

    setSubmitting(false)
    if (err) setError(err.message)
    else onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {isAdmin ? 'Create a Booking' : 'Request a Stay'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Date summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-between text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Check-in</p>
            <p className="font-semibold text-gray-800">{formatDisplayDate(checkIn)}</p>
          </div>
          <div className="text-center self-center">
            <p className="font-bold text-indigo-600 text-lg">{nights}</p>
            <p className="text-gray-400 text-xs">night{nights !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Check-out</p>
            <p className="font-semibold text-gray-800">{formatDisplayDate(checkOut)}</p>
          </div>
        </div>

        {/* Admin: book for a specific guest */}
        {isAdmin && allUsers && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Booking for</label>
            <select
              value={bookingFor}
              onChange={e => setBookingFor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} — {u.role.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quota info */}
        {!quota.unlimited && !adminOverride && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
            <span className="font-semibold">
              {quota.season === 'peak' ? 'Peak season' : 'Off-season'} quota:
            </span>{' '}
            {quota.remaining} of {quota.total} nights remaining
            {quota.used > 0 && ` (${quota.used} already used)`}
          </div>
        )}

        {/* Rule violation */}
        {!adminOverride && !validation.valid && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {validation.reason}
          </div>
        )}

        {/* Admin override toggle */}
        {isAdmin && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={adminOverride}
              onChange={e => setAdminOverride(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Override booking rules</span>
            {adminOverride && (
              <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Active</span>
            )}
          </label>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any special requests…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validation.valid || submitting}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : isAdmin ? 'Book Now' : 'Submit Request'}
          </button>
        </div>

        {!isAdmin && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Your request will be reviewed and approved by an admin.
          </p>
        )}
      </div>
    </div>
  )
}
