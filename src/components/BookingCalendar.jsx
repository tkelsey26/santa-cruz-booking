import { useState, useMemo } from 'react'
import { parseDate } from '../lib/bookingRules'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export default function BookingCalendar({ bookings, blockedDates, currentUserId, userRole, onRangeSelect }) {
  const isAdmin = userRole === 'admin'
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectionStart, setSelectionStart] = useState(null)
  const [hoverDate, setHoverDate] = useState(null)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const days = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(viewYear, viewMonth, d))
    return days
  }, [viewYear, viewMonth])

  function getDayStatus(date) {
    for (const b of blockedDates) {
      const start = parseDate(b.start_date)
      const end = parseDate(b.end_date)
      // Admins see 'blocked' (distinct colour); guests see it collapsed into 'unavailable'
      if (date >= start && date <= end) return isAdmin ? 'blocked' : 'unavailable'
    }
    for (const b of bookings) {
      const ci = parseDate(b.check_in)
      const co = parseDate(b.check_out)
      if (date >= ci && date < co) {
        if (b.status === 'approved') {
          if (b.user_id === currentUserId) return 'my-approved'
          return isAdmin ? 'approved' : 'unavailable'
        }
        if (b.status === 'pending') {
          if (b.user_id === currentUserId) return 'my-pending'
          return isAdmin ? 'other-pending' : 'unavailable'
        }
      }
    }
    return 'available'
  }

  function getSelectionRange() {
    if (!selectionStart) return null
    const end = hoverDate || selectionStart
    return end < selectionStart
      ? { start: end, end: selectionStart }
      : { start: selectionStart, end }
  }

  function handleDayClick(date) {
    if (!date || date < today) return
    const status = getDayStatus(date)
    if (['blocked', 'approved', 'my-approved', 'unavailable'].includes(status)) return

    if (!selectionStart) {
      setSelectionStart(date)
      return
    }

    // Same date clicked twice — reset
    if (isSameDay(date, selectionStart)) {
      setSelectionStart(null)
      return
    }

    let start = selectionStart
    let end = date
    if (end < start) [start, end] = [end, start]

    // Reject range that overlaps a block or approved booking
    let cur = new Date(start)
    while (cur < end) {
      const s = getDayStatus(cur)
      if (['blocked', 'approved', 'my-approved', 'unavailable'].includes(s)) {
        setSelectionStart(date)
        return
      }
      cur = addDays(cur, 1)
    }

    setSelectionStart(null)
    setHoverDate(null)
    onRangeSelect(start, end)
  }

  function dayClasses(date) {
    if (!date) return ''

    const isPast = date < today
    const isToday = isSameDay(date, today)
    const status = getDayStatus(date)
    const sel = getSelectionRange()
    const inSel = sel && date >= sel.start && date <= sel.end
    const isStart = selectionStart && isSameDay(date, selectionStart)

    const base = 'h-10 flex items-center justify-center text-sm rounded transition-colors select-none '

    if (isPast) return base + 'text-gray-300 cursor-default'
    if (isStart || inSel) return base + 'bg-indigo-500 text-white font-medium cursor-pointer'

    switch (status) {
      case 'my-approved':
        return base + 'bg-green-100 text-green-700 cursor-not-allowed'
      case 'approved': // admin view: someone else's approved booking
        return base + 'bg-green-50 text-green-600 cursor-not-allowed'
      case 'my-pending':
        return base + 'bg-amber-100 text-amber-700 cursor-not-allowed'
      case 'other-pending': // admin view only
        return base + 'bg-orange-50 text-orange-400 cursor-not-allowed'
      case 'blocked': // admin view only
        return base + 'bg-gray-300 text-gray-500 cursor-not-allowed'
      case 'unavailable': // non-admin view: blocked + others' bookings
        return base + 'bg-gray-200 text-gray-400 cursor-not-allowed'
      default:
        return base + `text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer ${isToday ? 'ring-2 ring-inset ring-indigo-400 font-semibold' : ''}`
    }
  }

  function prevMonth() {
    setSelectionStart(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectionStart(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-xl leading-none">‹</button>
        <h2 className="text-lg font-semibold text-gray-800">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-xl leading-none">›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((date, i) => (
          <div
            key={i}
            className={dayClasses(date)}
            onClick={() => handleDayClick(date)}
            onMouseEnter={() => date && selectionStart && setHoverDate(date)}
            onMouseLeave={() => setHoverDate(null)}
          >
            {date?.getDate()}
          </div>
        ))}
      </div>

      {/* Legend — simplified for guests, detailed for admins */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
        {(isAdmin ? [
          ['bg-green-100', 'Your approved bookings'],
          ['bg-green-50 border border-green-100', "Others' bookings"],
          ['bg-amber-100', 'Your pending request'],
          ['bg-orange-50 border border-orange-100', "Others' pending"],
          ['bg-gray-300', 'Blocked'],
          ['bg-indigo-500', 'Your selection'],
        ] : [
          ['bg-green-100', 'Your approved bookings'],
          ['bg-amber-100', 'Your pending requests'],
          ['bg-gray-200', 'Unavailable'],
          ['bg-indigo-500', 'Your selection'],
        ]).map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {selectionStart && (
        <p className="mt-3 text-sm text-indigo-600 font-medium">
          Check-in: {selectionStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — now click your check-out date
        </p>
      )}
    </div>
  )
}
