// code written by Rupneet (ID: 261096653)
// Code added by Nazifa Ahmed (261112966)

import '../styles/CalendarBlock.css'

function statusClass(category) {
  if (category === 'private') return 'calendar-block--private'
  if (category === 'booked') return 'calendar-block--booked'
  if (category === 'recurring') return 'calendar-block--recurring'
  if (category === 'group') return 'calendar-block--group'
  return 'calendar-block--public'
}

function oneLineStatus(slot) {
  if (slot.bookingStatus === 'Booked') return 'Booked'
  if (slot.category === 'recurring') return 'Recurring'
  if (slot.category === 'group' || slot.bookingStatus === 'Draft') return 'Draft'
  return 'Available'
}

// added by nazifa
function bookerLabel(slot) {
  const n = slot.bookingCount != null ? Number(slot.bookingCount) : 0
  if (n <= 0) return null
  const name = (slot.bookedBy && String(slot.bookedBy).trim()) || 'Student'
  if (n === 1) return name
  return `${name} +${n - 1} more`
}

export default function CalendarBlock({ slot, onSelect }) {
  const who = bookerLabel(slot)
  return (
    <button type="button" className={`calendar-block ${statusClass(slot.category)}`} onClick={() => onSelect(slot)}>
      <p className="calendar-block__title">{slot.title}</p>
      <p className="calendar-block__time">
        {slot.time} – {slot.endTime}
      </p>
      {who ? (
        <p className="calendar-block__booker" title={who}>
          {who}
        </p>
      ) : null}
      <p className="calendar-block__status">{oneLineStatus(slot)}</p>
    </button>
  )
}
