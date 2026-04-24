// Nazifa Ahmed (261112966)
import '../styles/CancelBookingCard.css'

// Shown when the user requests to cancel a booking (overlays the page).
export default function CancelBookingCard({ appointment, onConfirm, onClose, isLoading }) {
  if (!appointment) return null

  return (
    <div className="cancelbook-card-bg" onClick={onClose} role="presentation">
      <div
        className="cancelbook-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="cancel-booking-title"
        aria-modal="true"
      >
        <div className="cancelbook-card__top">
          <h2 id="cancel-booking-title">Cancel booking</h2>
          <button
            type="button"
            className="cancelbook-card__close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="cancelbook-card__blurb">
          This action will release your time slot. The instructor can be notified by email after the cancellation
          is recorded.
        </p>

        <ul className="cancelbook-card__info">
          <li>
            <span>Title</span> <b>{appointment.title}</b>
          </li>
          <li>
            <span>Instructor</span> <b>{appointment.ownerName}</b>
          </li>
          <li>
            <span>Date</span> <b>{appointment.dateLabel}</b>
          </li>
          <li>
            <span>Time</span> <b>{appointment.timeRange}</b>
          </li>
        </ul>

        <p className="cancelbook-card__hint">
          When you continue, your default email application may open with a message addressed to the instructor.
        </p>

        <div className="cancelbook-card__btns">
          <button
            type="button"
            className="cancelbook-card__btn cancelbook-card__btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Keep booking
          </button>
          <button
            type="button"
            className="cancelbook-card__btn cancelbook-card__btn--primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}
