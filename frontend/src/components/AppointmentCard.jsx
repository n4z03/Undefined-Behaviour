// Rupneet Shahriar (261096653)
// Code added by Nazifa Ahmed (261112966)
// Bonita Baladi (261097353) - wired Export button to GET /api/calendar/export/:bookingId

import '../styles/AppointmentCard.css'

async function exportAppointment(appointment) {
  // Prefer exportId when set (owners joining another host need slot id per /api/calendar/export).
  const rawExportId = appointment.exportId ?? appointment.id
  const numId = Number(rawExportId)
  if (!Number.isInteger(numId) || numId < 1) {
    window.alert('This appointment cannot be exported yet. Please refresh the page and try again.')
    return
  }
  try {
    const res = await fetch(`/api/calendar/export/${numId}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      window.alert(data.error || 'Could not export this appointment.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(appointment.title || 'appointment').replace(/\s+/g, '-')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Export error:', e)
    window.alert('Could not export this appointment.')
  }
}

export default function AppointmentCard({ appointment, onCancel, onReschedule }) {
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
        <a href={`mailto:${appointment.ownerEmail}`}>Message</a>
        {onReschedule ? (
          <button type="button" onClick={onReschedule}>
            Change time
          </button>
        ) : null}
        <button type="button" onClick={() => onCancel(appointment)}>
          Cancel Booking
        </button>
        <button type="button" onClick={() => exportAppointment(appointment)}>
          Export
        </button>
      </div>
    </article>
  )
}
