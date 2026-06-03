import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BookingCalendar from '../components/BookingCalendar'
import BookingModal from '../components/BookingModal'

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
