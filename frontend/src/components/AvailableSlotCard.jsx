import '../styles/AvailableSlotCard.css'

export default function AvailableSlotCard({ slot, onBook }) {
  return (
    <article className="available-slot-card">
      <div className="available-slot-card__top">
        <h3>{slot.title}</h3>
        <span>{slot.status}</span>
      </div>
      <p className="available-slot-card__owner">{slot.ownerName}</p>
      <p>{slot.dateLabel}</p>
      <p>{slot.timeRange}</p>
      {slot.recurringLabel ? <p className="available-slot-card__recurring">{slot.recurringLabel}</p> : null}
      <div className="available-slot-card__actions">
        <button type="button" onClick={() => onBook(slot.id)}>
          Book Slot
        </button>
        <a href={`mailto:${slot.ownerEmail}`}>Message Owner</a>
      </div>
    </article>
  )
}
