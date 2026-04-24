// Nazifa Ahmed (261112966)
import '../styles/CancelBookingCard.css'

// Shown for student (pass `appointment`) or owner (pass title + infoRows + blurb + hint).
export default function CancelBookingCard({
  appointment,
  title,
  blurb,
  hint,
  infoRows: rowsOverride,
  keepLabel = 'Keep booking',
  confirmLabel = 'Confirm cancellation',
  onConfirm,
  onClose,
  isLoading,
}) {
  const rows =
    rowsOverride ||
    (appointment
      ? [
          { label: 'Title', value: appointment.title },
          { label: 'Instructor', value: appointment.ownerName },
          { label: 'Date', value: appointment.dateLabel },
          { label: 'Time', value: appointment.timeRange },
        ]
      : null)

  let heading = title
  if (!heading && appointment) heading = 'Cancel booking'
  if (!rows || !heading) return null

  const bodyText =
    blurb ||
    (appointment
      ? 'This action will release your time slot. The instructor can be notified by email after the cancellation is recorded.'
      : null)
  const hintText =
    hint ||
    (appointment
      ? 'When you continue, your default email application may open with a message addressed to the instructor.'
      : null)
  if (bodyText == null || hintText == null) return null

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
          <h2 id="cancel-booking-title">{heading}</h2>
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

        <p className="cancelbook-card__blurb">{bodyText}</p>

        <ul className="cancelbook-card__info">
          {rows.map((row, i) => (
            <li key={`${row.label}-${i}`}>
              <span>{row.label}</span> <b>{row.value}</b>
            </li>
          ))}
        </ul>

        <p className="cancelbook-card__hint">{hintText}</p>

        <div className="cancelbook-card__btns">
          <button
            type="button"
            className="cancelbook-card__btn cancelbook-card__btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {keepLabel}
          </button>
          <button
            type="button"
            className="cancelbook-card__btn cancelbook-card__btn--primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
