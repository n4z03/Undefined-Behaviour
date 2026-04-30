//code written by Rupneet (ID: 261096653)
// code adedd by Bonita Baladi (261097353)
// one line debugged with AI (line 221)

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pad2(value) {
  return String(value).padStart(2, '0')
}

// db gives "10:00:00" or "10:00" -> html time input wants "10:00"
export function timeForInput(dbTime) {
  if (!dbTime) return '10:00'
  const parts = String(dbTime).split(':')
  const h = parts[0] != null ? Number(parts[0]) : 0
  const m = parts[1] != null ? Number(parts[1]) : 0
  if (Number.isNaN(h) || Number.isNaN(m)) return '10:00'
  return `${pad2(h)}:${pad2(m)}`
}

// added by Sophia (261149930)
function parseDateParts(slotDate) {
  const dateOnly = String(slotDate).split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  return { year, month, day }
}

function parseTimeParts(time) {
  const [hour = 0, minute = 0] = String(time || '').split(':').map(Number)
  return { hour, minute }
}

export function formatTime24To12(time) {
  const { hour, minute } = parseTimeParts(time)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 || 12
  return `${normalizedHour}:${pad2(minute)} ${suffix}`
}

export function to24Hour(time12) {
  const match = String(time12 || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return '10:00'
  let hour = Number(match[1]) % 12
  const minute = Number(match[2])
  const period = match[3].toUpperCase()
  if (period === 'PM') hour += 12
  return `${pad2(hour)}:${pad2(minute)}`
}

export function addMinutes(hhmm, deltaMinutes) {
  const { hour, minute } = parseTimeParts(hhmm)
  const total = hour * 60 + minute + deltaMinutes
  const normalized = ((total % 1440) + 1440) % 1440
  const nextHour = Math.floor(normalized / 60)
  const nextMinute = normalized % 60
  return `${pad2(nextHour)}:${pad2(nextMinute)}`
}

export function dayNameFromDate(slotDate) {
  const { year, month, day } = parseDateParts(slotDate)
  const jsDate = new Date(year, month - 1, day)
  return DAY_NAMES[jsDate.getDay()]
}

export function dateLabelFromDate(slotDate) {
  const { year, month, day } = parseDateParts(slotDate)
  const jsDate = new Date(year, month - 1, day)
  return jsDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function rowSpanFromTimes(startTime, endTime) {
  const start = parseTimeParts(startTime)
  const end = parseTimeParts(endTime)
  const startMins = start.hour * 60 + start.minute
  const endMins = end.hour * 60 + end.minute
  const diff = Math.max(30, endMins - startMins)
  return Math.max(1, Math.round(diff / 30))
}

/** Owner weekly calendar: first row starts at 9:00 AM; body covers until 7:00 PM (600 minutes). */
export const OWNER_CALENDAR_START_MIN = 9 * 60
export const OWNER_CALENDAR_END_MIN = 19 * 60

function toYmdFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseYmdLocal(ymd) {
  const dateOnly = String(ymd).split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function timeToMinutesFromMidnight(dbTime) {
  const { hour, minute } = parseTimeParts(dbTime)
  return hour * 60 + minute
}

/** Monday (YYYY-MM-DD) of the week that contains `anchorYmd` (defaults to today). */
export function getMondayOfWeekContaining(anchorYmd) {
  const fallback = `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`
  const ymd = anchorYmd && String(anchorYmd).trim() ? String(anchorYmd).split('T')[0] : fallback
  const d = parseYmdLocal(ymd)
  const dow = d.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + offset)
  return toYmdFromDate(d)
}

export function addDaysToYmd(ymd, deltaDays) {
  const d = parseYmdLocal(ymd)
  d.setDate(d.getDate() + deltaDays)
  return toYmdFromDate(d)
}

/** Left-hand time labels for each 30-minute row (9:00 … 6:30); grid ends at 7:00 PM. */
export function ownerCalendarTimeRowLabels() {
  const labels = []
  for (let m = OWNER_CALENDAR_START_MIN; m < OWNER_CALENDAR_END_MIN; m += 30) {
    const hh = Math.floor(m / 60)
    const mm = m % 60
    labels.push(formatTime24To12(`${pad2(hh)}:${pad2(mm)}:00`))
  }
  return labels
}

export function ownerCalendarEndTimeLabel() {
  return formatTime24To12('19:00:00')
}

/**
 * Seven columns Mon–Sun from a Monday YYYY-MM-DD.
 * @returns {{ dateStr: string, headerLabel: string, weekdayShort: string }[]}
 */
export function buildWeekColumnsFromMonday(mondayYmd) {
  return Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDaysToYmd(mondayYmd, i)
    const d = parseYmdLocal(dateStr)
    const weekdayShort = d.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      dateStr,
      weekdayShort,
      monthDay,
      headerLabel: `${weekdayShort} ${monthDay}`,
    }
  })
}

export function formatWeekRangeLabel(mondayYmd) {
  const sun = addDaysToYmd(mondayYmd, 6)
  const d0 = parseYmdLocal(mondayYmd)
  const d1 = parseYmdLocal(sun)
  const left = d0.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const right = d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${left} – ${right}`
}

export function getNextDateForWeekday(dayName) {
  const target = DAY_NAMES.indexOf(dayName)
  if (target < 0) return null

  const now = new Date()
  const current = now.getDay()
  let offset = target - current
  if (offset < 0) offset += 7

  const next = new Date(now)
  next.setDate(now.getDate() + offset)
  return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`
}

export function mapBackendSlotToCalendarSlot(slot) {
  const status = slot.status === 'active' ? 'Public' : 'Private'
  const bookingStatus = slot.current_bookings && Number(slot.current_bookings) > 0 ? 'Booked' : 'Available'
  const isRecurring = Boolean(slot.is_recurring)
  const category = bookingStatus === 'Booked' ? 'booked' : status === 'Public' ? 'public' : 'private'

  const nBooked = slot.current_bookings != null ? Number(slot.current_bookings) : 0
  const dateInput = String(slot.slot_date || '').split('T')[0]
  let startMin = timeToMinutesFromMidnight(slot.start_time)
  let endMin = timeToMinutesFromMidnight(slot.end_time)
  if (endMin <= startMin) endMin = startMin + 30

  const bookedByDisplay =
    slot.booked_by_display != null && String(slot.booked_by_display).trim() !== ''
      ? slot.booked_by_display
      : slot.booked_by_name || null

  return {
    id: `slot-${slot.id}`,
    backendId: slot.id,
    title: slot.title || 'Office Hours',
    day: dayNameFromDate(slot.slot_date),
    time: formatTime24To12(slot.start_time),
    endTime: formatTime24To12(slot.end_time),
    dateLabel: dateLabelFromDate(slot.slot_date),
    dateInput,
    fullDate: dateInput,
    timeInputStart: timeForInput(slot.start_time),
    timeInputEnd: timeForInput(slot.end_time),
    startMinutes: startMin,
    endMinutes: endMin,
    visibility: status,
    bookingStatus,
    bookingCount: nBooked,
    slotType: slot.slot_type || 'office_hours',
    bookedBy: bookedByDisplay,
    bookedEmail: slot.booked_by_email || null,
    
    // added by Bonita — recurring slots now respect visibility and booking status
    // instead of always showing as pink regardless of whether they are active or booked
    category: isRecurring
    ? (bookingStatus === 'Booked' ? 'booked' : status === 'Public' ? 'public' : 'private')
    : category,
   
    recurringLabel: isRecurring && slot.recurrence_weeks ? `Recurring for ${slot.recurrence_weeks} weeks` : null,
    inviteLink: slot.invite_link || null,
    rowSpan: rowSpanFromTimes(slot.start_time, slot.end_time),
    slotDate: slot.slot_date,
  }
}

export function mapBackendSlotsToCalendarSlots(slots) {
  return (slots || []).map(mapBackendSlotToCalendarSlot)
}

/** Keep a slot in the owner calendar only if its real calendar date falls in [mondayYmd, sundayYmd]. */
export function filterSlotsByWeek(slots, mondayYmd) {
  const endYmd = addDaysToYmd(mondayYmd, 6)
  return (slots || []).filter((s) => {
    const d = s.fullDate || s.dateInput
    if (!d) return false
    return d >= mondayYmd && d <= endYmd
  })
}

export function buildCreateSlotPayload({ title, visibility, selectedCell }) {
  const slotDate =
    selectedCell?.slotDate || selectedCell?.fullDate || getNextDateForWeekday('Tuesday')

  let startTime = selectedCell?.startTime24
  if (!startTime && selectedCell?.time) startTime = to24Hour(selectedCell.time)
  if (!startTime) startTime = '10:00'

  let endTime = selectedCell?.endTime24 || addMinutes(startTime, 30)

  return {
    title: (title || 'Office Hours').trim(),
    slot_date: slotDate,
    start_time: startTime,
    end_time: endTime,
    status: visibility === 'Public' ? 'active' : 'private',
  }
}
