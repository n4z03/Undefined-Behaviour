// code written by Rupneet (ID: 261096653)

import '../styles/SlotCard.css'

function badgeClass(value) {
  const normalized = value.toLowerCase().replace(/\s+/g, '-')
  return `slot-badge slot-badge--${normalized}`
}

export default function SlotCard({ slot }) {
  return (
    <article className="slot-card">
      <div className="slot-card__top">
        <h3>{slot.title}</h3>
        <div className="slot-card__badges">
          <span className={badgeClass(slot.visibility)}>{slot.visibility}</span>
          <span className={badgeClass(slot.booking)}>{slot.booking}</span>
        </div>
      </div>
      <p className="slot-card__meta">{slot.date}</p>
      <p className="slot-card__meta">{slot.timeRange}</p>
      {slot.bookedBy ? <p className="slot-card__booked">Booked by: {slot.bookedBy}</p> : null}
      {slot.recurringLabel ? <p className="slot-card__repeat">{slot.recurringLabel}</p> : null}
      <div className="slot-card__actions">
        <button type="button">{slot.visibility === 'Public' ? 'Deactivate' : 'Activate'}</button>
        <button type="button">View Booking</button>
        <button type="button">Delete</button>
        <button type="button">Copy Invite Link</button>
      </div>
    </article>
  )
}
