// Parse "YYYY-MM-DD" as a local date (avoids timezone-shift bugs)
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function countNights(checkIn, checkOut) {
  return Math.round((checkOut - checkIn) / (24 * 60 * 60 * 1000))
}

// June (month 6) through October (month 10) is peak season
export function isPeakSeason(date) {
  const m = date.getMonth() + 1
  return m >= 6 && m <= 10
}

// Off-season spans Nov–May across a calendar year boundary.
// We define the "off-season year" as the year November starts in:
//   Nov–Dec  → current year
//   Jan–May  → previous year (season started last November)
function offSeasonYear(date) {
  const m = date.getMonth() + 1
  return m >= 11 ? date.getFullYear() : date.getFullYear() - 1
}

function usedNightsInPeriod(checkIn, existingBookings) {
  const peak = isPeakSeason(checkIn)
  return existingBookings
    .filter(b => b.status === 'approved')
    .filter(b => {
      const ci = parseDate(b.check_in)
      if (peak) {
        return isPeakSeason(ci) && ci.getFullYear() === checkIn.getFullYear()
      } else {
        return !isPeakSeason(ci) && offSeasonYear(ci) === offSeasonYear(checkIn)
      }
    })
    .reduce((sum, b) => sum + countNights(parseDate(b.check_in), parseDate(b.check_out)), 0)
}

// Returns { valid: true } or { valid: false, reason: string }
export function validateBooking(checkIn, checkOut, userRole, existingUserBookings) {
  if (userRole === 'admin' || userRole === 'priority_guest') {
    return { valid: true }
  }

  const nights = countNights(checkIn, checkOut)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const advanceDays = Math.round((checkIn - today) / (24 * 60 * 60 * 1000))

  if (advanceDays > 90) {
    return { valid: false, reason: 'Regular guests can only book up to 90 days in advance.' }
  }

  const peak = isPeakSeason(checkIn)

  if (peak) {
    if (nights > 7) {
      return { valid: false, reason: 'Peak season (June–October) stays are limited to 7 nights for regular guests.' }
    }
    const used = usedNightsInPeriod(checkIn, existingUserBookings)
    if (used + nights > 7) {
      const remaining = Math.max(0, 7 - used)
      return {
        valid: false,
        reason: `You have ${remaining} peak-season night${remaining === 1 ? '' : 's'} remaining this year (7 total). This stay requires ${nights}.`,
      }
    }
  } else {
    if (nights > 14) {
      return { valid: false, reason: 'Off-season (November–May) stays are limited to 14 nights for regular guests.' }
    }
    const used = usedNightsInPeriod(checkIn, existingUserBookings)
    if (used + nights > 30) {
      const remaining = Math.max(0, 30 - used)
      return {
        valid: false,
        reason: `You have ${remaining} off-season night${remaining === 1 ? '' : 's'} remaining this season (30 total). This stay requires ${nights}.`,
      }
    }
  }

  return { valid: true }
}

// Returns quota info for display in the booking modal
export function getQuotaInfo(checkIn, userRole, existingBookings) {
  if (userRole === 'admin' || userRole === 'priority_guest') {
    return { unlimited: true }
  }
  const peak = isPeakSeason(checkIn)
  const used = usedNightsInPeriod(checkIn, existingBookings)
  if (peak) {
    return { unlimited: false, used, total: 7, remaining: Math.max(0, 7 - used), season: 'peak', maxStay: 7 }
  } else {
    return { unlimited: false, used, total: 30, remaining: Math.max(0, 30 - used), season: 'off-season', maxStay: 14 }
  }
}
