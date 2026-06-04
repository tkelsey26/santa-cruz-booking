import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BookingCalendar from '../components/BookingCalendar'
import BookingModal from '../components/BookingModal'
import { getQuotaInfo, isPeakSeason } from '../lib/bookingRules'

function RulesPanel({ userRole, userBookings }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yr = today.getFullYear()

  if (userRole === 'admin') {
    return (
      <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl px-5 py-4 text-sm text-purple-700">
        <span className="font-semibold">Admin access —</span> no booking restrictions apply to you.
        Use the Override checkbox when booking on behalf of a guest to bypass their rules.
      </div>
    )
  }

  if (userRole === 'priority_guest') {
    return (
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-sm text-amber-700">
        <span className="font-semibold">⭐ Priority Guest —</span> unlimited stay length, unlimited
        nights per season, and you can book up to 1 year in advance.
      </div>
    )
  }

  // Regular guest: compute remaining quota for both seasons.
  // Peak season: if we're past Oct, show next year's peak (nothing used yet).
  const peakYear = today.getMonth() >= 10 ? yr + 1 : yr
  const peakRef = new Date(peakYear, 6, 1) // July 1
  const peak = getQuotaInfo(peakRef, userRole, userBookings)

  // Off-season: if in peak (Jun–Oct), show upcoming off-season (Nov this year).
  // Otherwise use today so it matches whichever off-season we're currently in.
  const offRef = isPeakSeason(today) ? new Date(yr, 11, 1) : today
  const off = getQuotaInfo(offRef, userRole, userBookings)
  // Label spans two calendar years, e.g. "Nov 2026 – May 2027"
  const offStartYear = offRef.getMonth() >= 10 ? offRef.getFullYear() : offRef.getFullYear() - 1

  function QuotaBar({ used, total }) {
    const pct = Math.min(100, Math.round((used / total) * 100))
    const colour = pct >= 100 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-400'
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{used}/{total} nights used</span>
      </div>
    )
  }

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl px-5 py-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Booking Allowance</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Peak Season — June – October {peakYear}
          </p>
          <ul className="text-sm text-gray-600 space-y-0.5">
            <li>Max <strong>{peak.maxStay} nights</strong> per stay</li>
            <li><strong>{peak.remaining} of {peak.total} nights</strong> remaining this season</li>
            <li>Book up to <strong>90 days</strong> in advance</li>
          </ul>
          <QuotaBar used={peak.used} total={peak.total} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Off-Season — Nov {offStartYear} – May {offStartYear + 1}
          </p>
          <ul className="text-sm text-gray-600 space-y-0.5">
            <li>Max <strong>{off.maxStay} nights</strong> per stay</li>
            <li><strong>{off.remaining} of {off.total} nights</strong> remaining this season</li>
            <li>Book up to <strong>90 days</strong> in advance</li>
          </ul>
          <QuotaBar used={off.used} total={off.total} />
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { user, profile, isAdmin } = useAuth()
  const [bookings, setBookings] = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalDates, setModalDates] = useState(null)

  async function fetchData() {
    const [bookingsRes, blockedRes] = await Promise.all([
      supabase.from('bookings').select('*').neq('status', 'rejected'),
      supabase.from('blocked_dates').select('*'),
    ])
    if (bookingsRes.data) setBookings(bookingsRes.data)
    if (blockedRes.data) setBlockedDates(blockedRes.data)

    if (isAdmin) {
      const { data } = await supabase.from('profiles').select('*').order('full_name')
      if (data) setAllUsers(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user, isAdmin])

  function handleModalSuccess() {
    setModalDates(null)
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading calendar…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Book a Stay</h1>
          <p className="text-gray-500 text-sm mt-1">
            Click a start date, then click an end date to request a booking.
          </p>
        </div>
        <BookingCalendar
          bookings={bookings}
          blockedDates={blockedDates}
          currentUserId={user.id}
          userRole={profile?.role}
          onRangeSelect={(start, end) => setModalDates({ checkIn: start, checkOut: end })}
        />
        {profile && (
          <RulesPanel
            userRole={profile.role}
            userBookings={bookings.filter(b => b.user_id === user.id)}
          />
        )}
      </main>

      {modalDates && (
        <BookingModal
          checkIn={modalDates.checkIn}
          checkOut={modalDates.checkOut}
          allUsers={isAdmin ? allUsers : null}
          existingBookings={bookings}
          onClose={() => setModalDates(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
