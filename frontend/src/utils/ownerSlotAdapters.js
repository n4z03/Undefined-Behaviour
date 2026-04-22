// Frontend adapters for owner slot API data

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseDateParts(slotDate) {
  const [year, month, day] = String(slotDate).split('-').map(Number)
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

  return {
    id: `slot-${slot.id}`,
    backendId: slot.id,
    title: slot.title || 'Office Hours',
    day: dayNameFromDate(slot.slot_date),
    time: formatTime24To12(slot.start_time),
    endTime: formatTime24To12(slot.end_time),
    dateLabel: dateLabelFromDate(slot.slot_date),
    visibility: status,
    bookingStatus,
    bookedBy: slot.booked_by_name || null,
    bookedEmail: slot.booked_by_email || null,
    category: isRecurring ? 'recurring' : category,
    recurringLabel: isRecurring && slot.recurrence_weeks ? `Recurring for ${slot.recurrence_weeks} weeks` : null,
    inviteLink: slot.invite_link || `https://mcbook.app/invite/slot-${slot.id}`,
    rowSpan: rowSpanFromTimes(slot.start_time, slot.end_time),
    slotDate: slot.slot_date,
  }
}

export function mapBackendSlotsToCalendarSlots(slots) {
  return slots
    .map(mapBackendSlotToCalendarSlot)
    .filter((slot) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(slot.day))
}

export function buildCreateSlotPayload({ title, visibility, selectedCell }) {
  const startTime = to24Hour(selectedCell?.time || '10:00 AM')
  const endTime = addMinutes(startTime, 30)

  return {
    title: (title || 'Office Hours').trim(),
    slot_date: selectedCell?.slotDate || getNextDateForWeekday(selectedCell?.day || 'Tuesday'),
    start_time: startTime,
    end_time: endTime,
    status: visibility === 'Public' ? 'active' : 'private',
  }
}
