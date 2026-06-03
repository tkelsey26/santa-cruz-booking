import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { parseDate, formatDisplayDate, countNights } from '../lib/bookingRules'

const TABS = ['Bookings', 'Upcoming Stays', 'Blocked Dates', 'Users']

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const ROLE_STYLE = {
  admin: 'bg-purple-100 text-purple-700',
  priority_guest: 'bg-amber-100 text-amber-700',
  regular_guest: 'bg-gray-100 text-gray-600',
}

const ROLE_LABEL = {
  admin: 'Admin',
  priority_guest: 'Priority Guest',
  regular_guest: 'Regular Guest',
}

function BookingCard({ booking, onApprove, onReject, onDelete }) {
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes || '')
  const checkIn = parseDate(booking.check_in)
  const checkOut = parseDate(booking.check_out)
  const nights = countNights(checkIn, checkOut)
  const guestName = booking.profiles?.full_name || booking.profiles?.email || 'Unknown guest'
  const guestRole = booking.profiles?.role

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[booking.status]}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            {guestRole && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLE[guestRole]}`}>
                {ROLE_LABEL[guestRole]}
              </span>
            )}
            {booking.admin_override && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Override</span>
            )}
          </div>
          <p className="font-semibold text-gray-800">{guestName}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)} · {nights} night{nights !== 1 ? 's' : ''}
          </p>
          {booking.notes && (
            <p className="text-sm text-gray-400 mt-1 italic">"{booking.notes}"</p>
          )}
          {booking.admin_notes && booking.status !== 'pending' && (
            <p className="text-sm text-indigo-600 mt-1">Note: {booking.admin_notes}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {booking.status === 'pending' && (
            <>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Optional note to guest…"
                rows={2}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-44 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(booking.id, adminNotes)}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(booking.id, adminNotes)}
                  className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 font-medium"
                >
                  Reject
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => onDelete(booking.id)}
            className="text-xs text-gray-300 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(0)
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [newBlock, setNewBlock] = useState({ start_date: '', end_date: '', reason: '' })

  async function fetchAll() {
    const [bookingsRes, usersRes, blockedRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, profiles(full_name, email, role)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('blocked_dates').select('*').order('start_date'),
    ])
    if (bookingsRes.data) setBookings(bookingsRes.data)
    if (usersRes.data) setUsers(usersRes.data)
    if (blockedRes.data) setBlockedDates(blockedRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function updateBookingStatus(id, status, adminNotes) {
    await supabase.from('bookings').update({ status, admin_notes: adminNotes || null }).eq('id', id)
    fetchAll()
  }

  async function deleteBooking(id) {
    if (!confirm('Permanently delete this booking?')) return
    await supabase.from('bookings').delete().eq('id', id)
    fetchAll()
  }

  async function updateUserRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    fetchAll()
  }

  async function addBlockedDates() {
    if (!newBlock.start_date || !newBlock.end_date) return
    await supabase.from('blocked_dates').insert({
      start_date: newBlock.start_date,
      end_date: newBlock.end_date,
      reason: newBlock.reason.trim() || null,
      created_by: user.id,
    })
    setNewBlock({ start_date: '', end_date: '', reason: '' })
    fetchAll()
  }

  async function deleteBlockedDate(id) {
    await supabase.from('blocked_dates').delete().eq('id', id)
    fetchAll()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pending = bookings.filter(b => b.status === 'pending')
  const history = bookings.filter(b => b.status !== 'pending')

  // Upcoming Stays: approved bookings + blocked dates, both ending today or later, sorted by start date
  const upcomingBookings = bookings
    .filter(b => b.status === 'approved' && parseDate(b.check_out) >= today)
    .map(b => ({ type: 'booking', date: parseDate(b.check_in), data: b }))

  const upcomingBlocked = blockedDates
    .filter(b => parseDate(b.end_date) >= today)
    .map(b => ({ type: 'blocked', date: parseDate(b.start_date), data: b }))

  const upcomingItems = [...upcomingBookings, ...upcomingBlocked]
    .sort((a, b) => a.date - b.date)

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
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h1>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                tab === i ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {i === 0 && pending.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 align-middle">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings: pending at top, then history */}
        {tab === 0 && (
          <div>
            {bookings.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">No bookings yet.</div>
            )}

            {pending.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Pending Requests
                </h2>
                <div className="space-y-3">
                  {pending.map(b => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onApprove={(id, notes) => updateBookingStatus(id, 'approved', notes)}
                      onReject={(id, notes) => updateBookingStatus(id, 'rejected', notes)}
                      onDelete={deleteBooking}
                    />
                  ))}
                </div>
              </section>
            )}

            {history.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  History
                </h2>
                <div className="space-y-3">
                  {history.map(b => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onApprove={(id, notes) => updateBookingStatus(id, 'approved', notes)}
                      onReject={(id, notes) => updateBookingStatus(id, 'rejected', notes)}
                      onDelete={deleteBooking}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Upcoming Stays: approved bookings + blocked dates, chronological, future only */}
        {tab === 1 && (
          <div className="space-y-3">
            {upcomingItems.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">Nothing upcoming.</div>
            )}
            {upcomingItems.map(({ type, data }) =>
              type === 'booking' ? (
                <BookingCard
                  key={`booking-${data.id}`}
                  booking={data}
                  onApprove={(id, notes) => updateBookingStatus(id, 'approved', notes)}
                  onReject={(id, notes) => updateBookingStatus(id, 'rejected', notes)}
                  onDelete={deleteBooking}
                />
              ) : (
                <div key={`blocked-${data.id}`} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Blocked
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {formatDisplayDate(parseDate(data.start_date))} → {formatDisplayDate(parseDate(data.end_date))}
                      </p>
                      {data.reason && <p className="text-xs text-gray-400 mt-0.5">{data.reason}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBlockedDate(data.id)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Blocked Dates management */}
        {tab === 2 && (
          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h3 className="font-semibold text-gray-700 mb-4">Block a date range</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={newBlock.start_date}
                    onChange={e => setNewBlock(b => ({ ...b, start_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={newBlock.end_date}
                    onChange={e => setNewBlock(b => ({ ...b, end_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={newBlock.reason}
                  onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))}
                  placeholder="e.g. Family gathering, Maintenance…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={addBlockedDates}
                disabled={!newBlock.start_date || !newBlock.end_date}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Block dates
              </button>
            </div>

            <div className="space-y-2">
              {blockedDates.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No blocked dates.</p>
              )}
              {blockedDates.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {formatDisplayDate(parseDate(b.start_date))} → {formatDisplayDate(parseDate(b.end_date))}
                    </p>
                    {b.reason && <p className="text-xs text-gray-400 mt-0.5">{b.reason}</p>}
                  </div>
                  <button
                    onClick={() => deleteBlockedDate(b.id)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 3 && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{u.full_name || '(no name)'}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <select
                  value={u.role}
                  onChange={e => updateUserRole(u.id, e.target.value)}
                  disabled={u.id === user.id}
                  className={`shrink-0 text-xs font-medium px-2 py-1.5 rounded-lg border border-transparent cursor-pointer ${ROLE_STYLE[u.role]} disabled:opacity-50 disabled:cursor-default`}
                >
                  <option value="regular_guest">Regular Guest</option>
                  <option value="priority_guest">Priority Guest</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
