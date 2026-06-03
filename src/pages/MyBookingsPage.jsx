import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { parseDate, formatDisplayDate, countNights } from '../lib/bookingRules'

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

function BookingCard({ booking, onCancel }) {
  const checkIn = parseDate(booking.check_in)
  const checkOut = parseDate(booking.check_out)
  const nights = countNights(checkIn, checkOut)
  const isPast = checkOut < new Date()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[booking.status]}`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
          {booking.admin_override && (
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Admin override
            </span>
          )}
        </div>
        <p className="font-semibold text-gray-800">
          {formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          {nights} night{nights !== 1 ? 's' : ''}
        </p>
        {booking.notes && (
          <p className="text-sm text-gray-400 mt-1 italic">"{booking.notes}"</p>
        )}
        {booking.admin_notes && (
          <p className="text-sm text-indigo-600 mt-1">
            <span className="font-medium">Admin note:</span> {booking.admin_notes}
          </p>
        )}
      </div>
      {booking.status === 'pending' && !isPast && (
        <button
          onClick={() => onCancel(booking.id)}
          className="shrink-0 text-sm text-red-400 hover:text-red-600 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
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
  const past = bookings.filter(b => parseDate(b.check_out) < today)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Bookings</h1>

        {bookings.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No bookings yet</p>
            <p className="text-sm mt-1">Go to the Calendar page to request a stay.</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Past</h2>
            <div className="space-y-3 opacity-60">
              {past.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
