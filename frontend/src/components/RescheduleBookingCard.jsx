import { useEffect, useState } from 'react'
import '../styles/RescheduleBookingCard.css'

export default function RescheduleBookingCard({
  appointment,
  slotOptions,
  isLoading,
  errMsg,
  onClose,
  onConfirm,
}) {
  const [slotId, setSlotId] = useState('')

  useEffect(() => {
    const first = slotOptions && slotOptions[0]
    setSlotId(first ? String(first.id) : '')
  }, [slotOptions, appointment?.id])

  return (
    <div className="reschedule-booking-overlay" role="dialog" aria-modal="true" aria-label="Reschedule">
      <div className="reschedule-booking-card">
        <h2>Change time</h2>
        {appointment ? (
          <p>
            {appointment.title} — {appointment.dateLabel}
          </p>
        ) : null}
        <label htmlFor="reschedule-slot">Choose another time with this instructor</label>
        <select
          id="reschedule-slot"
          value={slotId}
          onChange={(e) => setSlotId(e.target.value)}
          disabled={isLoading || !slotOptions?.length}
        >
          {slotOptions?.length
            ? slotOptions.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.label}
                </option>
              ))
            : null}
        </select>
        {!slotOptions?.length ? (
          <p className="reschedule-booking-card__err">No other open slots to switch to. Try again after more hours are published.</p>
        ) : null}
        {errMsg ? <p className="reschedule-booking-card__err">{errMsg}</p> : null}
        <div className="reschedule-booking-card__actions">
          <button type="button" onClick={onClose} disabled={isLoading}>
            Close
          </button>
          <button
            type="button"
            className="reschedule-booking-card__primary"
            disabled={isLoading || !slotId}
            onClick={() => onConfirm && onConfirm(slotId)}
          >
            {isLoading ? 'Moving…' : 'Confirm move'}
          </button>
        </div>
      </div>
    </div>
  )
}
