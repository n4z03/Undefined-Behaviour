// code written by Rupneet (ID: 261096653)
// code added by Sophia (261149930)

import '../styles/RequestCard.css'

function parseTimeFromSubject(subject) {
  if (!subject) return null
  const match = subject.match(/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s+-\s+(\d{2}:\d{2}(?::\d{2})?)\]/)
  if (!match) return null
  return { date: match[1], start: match[2], end: match[3] }
}

export default function RequestCard({ request, onAccept, onDecline }) {
  const proposed = parseTimeFromSubject(request.subject)
  return (
    <article className="request-card">
      <div className="request-card__top">
        <h3>{request.user_name}</h3>
        <span className="request-card__status">{request.status}</span>
      </div>
      <p className="request-card__email">{request.user_email}</p>
      {proposed ? (<p className="request-card__time">Proposed: {proposed.date} — {proposed.start} to {proposed.end}</p>
      ) : null}
      <p className="request-card__topic">Message: {request.message}</p>
      <p className="request-card__time">Request created at: {request.created_at}</p>
      <div className="request-card__actions">
        {request.status === 'pending' ? (
          <>
          <button type="button" onClick={() => onAccept(request.id)}>Accept</button>
          <button type="button" onClick={() => onDecline(request.id)}>Decline</button>
          </>
        ) : null}
        <a href={`mailto:${request.user_email}`}>Message Student</a>
      </div>
    </article>
  )
}
