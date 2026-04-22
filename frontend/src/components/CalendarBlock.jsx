// code written by Rupneet (ID: 261096653)

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

export default function CalendarBlock({ slot, onSelect }) {
  return (
    <button type="button" className={`calendar-block ${statusClass(slot.category)}`} onClick={() => onSelect(slot)}>
      <p className="calendar-block__title">{slot.title}</p>
      <p className="calendar-block__time">
        {slot.time} – {slot.endTime}
      </p>
      <p className="calendar-block__status">{oneLineStatus(slot)}</p>
    </button>
  )
}
