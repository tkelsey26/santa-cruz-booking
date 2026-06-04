import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BookingCalendar from '../components/BookingCalendar'
import BookingModal from '../components/BookingModal'
import { getQuotaInfo, isPeakSeason } from '../lib/bookingRules'
import { Card, CardContent } from '@/components/ui/card'

function QuotaBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const colour = pct >= 100 ? 'bg-rose-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 shrink-0 tabular-nums">{used}/{total} nights</span>
    </div>
  )
}

function RulesPanel({ userRole, userBookings }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yr = today.getFullYear()

  if (userRole === 'admin') {
    return (
      <Card className="mt-4 border-violet-100 bg-violet-50">
        <CardContent className="py-3 px-4 text-sm text-violet-700">
          <span className="font-semibold">Admin access —</span> no booking restrictions.
          Use the Override checkbox to bypass rules when booking on behalf of a guest.
        </CardContent>
      </Card>
    )
  }

  if (userRole === 'priority_guest') {
    return (
      <Card className="mt-4 border-amber-100 bg-amber-50">
        <CardContent className="py-3 px-4 text-sm text-amber-700">
          <span className="font-semibold">⭐ Priority Guest —</span> unlimited stay length,
          unlimited nights per season, book up to 1 year in advance.
        </CardContent>
      </Card>
    )
  }

  const peakYear      = today.getMonth() >= 10 ? yr + 1 : yr
  const peakRef       = new Date(peakYear, 6, 1)
  const peak          = getQuotaInfo(peakRef, userRole, userBookings)

  const offRef        = isPeakSeason(today) ? new Date(yr, 11, 1) : today
  const off           = getQuotaInfo(offRef, userRole, userBookings)
  const offStartYear  = offRef.getMonth() >= 10 ? offRef.getFullYear() : offRef.getFullYear() - 1

  return (
    <Card className="mt-4">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Your Booking Allowance</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Peak Season · Jun–Oct {peakYear}
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>Max <strong className="text-slate-800">{peak.maxStay} nights</strong> per stay</li>
              <li><strong className="text-slate-800">{peak.remaining}</strong> of {peak.total} nights remaining</li>
              <li className="text-slate-400 text-xs">Book up to 90 days in advance</li>
            </ul>
            <QuotaBar used={peak.used} total={peak.total} />
          </div>

          <div className="sm:border-l sm:border-slate-100 sm:pl-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Off-Season · Nov {offStartYear}–May {offStartYear + 1}
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>Max <strong className="text-slate-800">{off.maxStay} nights</strong> per stay</li>
              <li><strong className="text-slate-800">{off.remaining}</strong> of {off.total} nights remaining</li>
              <li className="text-slate-400 text-xs">Book up to 90 days in advance</li>
            </ul>
            <QuotaBar used={off.used} total={off.total} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CalendarPage() {
  const { user, profile, isAdmin } = useAuth()
  const [bookings, setBookings]       = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [allUsers, setAllUsers]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalDates, setModalDates]   = useState(null)

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

  useEffect(() => { if (user) fetchData() }, [user, isAdmin])

  if (loading) {
    return (
      <div className="min-h-screen bg-sea-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading calendar…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sea-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Book a Stay</h1>
          <p className="text-slate-500 text-sm mt-1">
            Click a start date, then an end date to request a booking.
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
          onSuccess={() => { setModalDates(null); fetchData() }}
        />
      )}
    </div>
  )
}
