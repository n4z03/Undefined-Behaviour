import '../styles/CancelBookingCard.css'

export default function CancelBookingCard({
  appointment,
  title,
  blurb,
  infoRows,
  hint,
  keepLabel,
  confirmLabel,
  isLoading,
  onClose,
  onConfirm,
}) {
  if (appointment) {
    return (
      <div className="cancel-booking-overlay" role="dialog" aria-modal="true" aria-label="Cancel booking">
        <div className="cancel-booking-card">
          <h2>Cancel this booking?</h2>
          <p>
            <strong>{appointment.title}</strong>
          </p>
          <p>{appointment.dateLabel}</p>
          <p>{appointment.timeRange}</p>
          <p className="cancel-booking-card__hint">The owner can be notified by email when you confirm.</p>
          <div className="cancel-booking-card__actions">
            <button type="button" onClick={onClose} disabled={isLoading}>
              Keep appointment
            </button>
            <button type="button" className="cancel-booking-card__primary" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cancel-booking-overlay" role="dialog" aria-modal="true" aria-label={title || 'Confirm'}>
      <div className="cancel-booking-card">
        {title ? <h2>{title}</h2> : null}
        {blurb ? <p>{blurb}</p> : null}
        {Array.isArray(infoRows)
          ? infoRows.map((row) => (
              <div key={row.label} className="cancel-booking-card__row">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))
          : null}
        {hint ? <p className="cancel-booking-card__hint">{hint}</p> : null}
        <div className="cancel-booking-card__actions">
          <button type="button" onClick={onClose} disabled={isLoading}>
            {keepLabel || 'Close'}
          </button>
          <button type="button" className="cancel-booking-card__primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '…' : confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
