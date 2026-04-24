// Nazifa Ahmed (261112966)
// 
// user picks another open slot available with the same prof
import { useEffect, useState } from 'react'
import '../styles/RescheduleBookingCard.css'

export default function RescheduleBookingCard({
  appointment,
  slotOptions,
  onClose,
  onConfirm,
  isLoading,
  errMsg,
}) {
  const [pick, setPick] = useState('')

  useEffect(() => {
    setPick('')
  }, [appointment])

  if (!appointment) return null

  const hasOptions = Array.isArray(slotOptions) && slotOptions.length > 0

  return (
    <div className="reschedulebook-card-bg" onClick={onClose} role="presentation">
      <div
        className="reschedulebook-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reschedule-title"
        aria-modal="true"
      >
        <div className="reschedulebook-card__top">
          <h2 id="reschedule-title">Change time</h2>
          <button
            type="button"
            className="reschedulebook-card__close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="reschedulebook-card__blurb">
          Your booking stays with the same instructor, but you can switch to a different public slot (another date
          or time) if it is open.
        </p>

        <ul className="reschedulebook-card__info">
          <li>
            <span>Title</span> <b>{appointment.title}</b>
          </li>
          <li>
            <span>Instructor</span> <b>{appointment.ownerName}</b>
          </li>
          <li>
            <span>Current</span>{' '}
            <b>
              {appointment.dateLabel} · {appointment.timeRange}
            </b>
          </li>
        </ul>

        {hasOptions ? (
          <label className="reschedulebook-card__field">
            <span>New slot</span>
            <select
              className="reschedulebook-card__select"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="">Select…</option>
              {slotOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="reschedulebook-card__empty">No other open slots to switch to. Try again later or cancel and book a new one.</p>
        )}

        {errMsg ? <p className="reschedulebook-card__err">{errMsg}</p> : null}

        <div className="reschedulebook-card__btns">
          <button
            type="button"
            className="reschedulebook-card__btn reschedulebook-card__btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Back
          </button>
          <button
            type="button"
            className="reschedulebook-card__btn reschedulebook-card__btn--primary"
            onClick={() => (pick ? onConfirm(pick) : null)}
            disabled={isLoading || !pick}
          >
            {isLoading ? 'Saving…' : 'Move my booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
