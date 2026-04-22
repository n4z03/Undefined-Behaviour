import '../styles/AppointmentCard.css'

export default function AppointmentCard({ appointment, onCancel }) {
  return (
    <article className="appointment-card">
      <div className="appointment-card__top">
        <h3>{appointment.title}</h3>
        <span>{appointment.status}</span>
      </div>
      <p className="appointment-card__owner">{appointment.ownerName}</p>
      <p>{appointment.dateLabel}</p>
      <p>{appointment.timeRange}</p>
      {appointment.recurringLabel ? <p className="appointment-card__recurring">{appointment.recurringLabel}</p> : null}
      <div className="appointment-card__actions">
        <a href={`mailto:${appointment.ownerEmail}`}>Message Owner</a>
        <button type="button" onClick={() => onCancel(appointment.id)}>
          Cancel Booking
        </button>
        <button type="button">Export</button>
      </div>
    </article>
  )
}
