import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { parseDate, formatDisplayDate, countNights } from '../lib/bookingRules'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const STATUS_VARIANT = {
  pending:  'pending',
  approved: 'approved',
  rejected: 'rejected',
}

function BookingCard({ booking, onCancel }) {
  const checkIn  = parseDate(booking.check_in)
  const checkOut = parseDate(booking.check_out)
  const nights   = countNights(checkIn, checkOut)
  const isPast   = checkOut < new Date()

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={STATUS_VARIANT[booking.status]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
              {booking.admin_override && (
                <Badge variant="admin">Admin override</Badge>
              )}
            </div>
            <p className="font-semibold text-slate-800">
              {formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {nights} night{nights !== 1 ? 's' : ''}
            </p>
            {booking.notes && (
              <p className="text-sm text-slate-400 mt-1.5 italic">"{booking.notes}"</p>
            )}
            {booking.admin_notes && (
              <p className="text-sm text-sea-600 mt-1.5">
                <span className="font-medium">Note from admin:</span> {booking.admin_notes}
              </p>
            )}
          </div>
          {booking.status === 'pending' && !isPast && (
            <Button variant="ghost" size="sm" onClick={() => onCancel(booking.id)}
              className="shrink-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50">
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('check_in', { ascending: false })
    if (data) setBookings(data)
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [user.id])

  async function handleCancel(id) {
    if (!confirm('Cancel this booking request?')) return
    await supabase.from('bookings').delete().eq('id', id)
    fetchBookings()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = bookings.filter(b => parseDate(b.check_out) >= today)
  const past     = bookings.filter(b => parseDate(b.check_out) <  today)

  if (loading) {
    return (
      <div className="min-h-screen bg-sea-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sea-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-slate-800 mb-6">My Bookings</h1>

        {bookings.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm mt-1">Go to the Calendar to request a stay.</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            {upcoming.length > 0 && <Separator className="mb-8" />}
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Past</p>
            <div className="space-y-3 opacity-60">
              {past.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
