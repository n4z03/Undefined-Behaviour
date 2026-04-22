// code written by Rupneet (ID: 261096653)

import '../styles/RequestCard.css'

export default function RequestCard({ request }) {
  return (
    <article className="request-card">
      <div className="request-card__top">
        <h3>{request.name}</h3>
        <span className="request-card__status">{request.status}</span>
      </div>
      <p className="request-card__email">{request.email}</p>
      <p className="request-card__topic">Message: "{request.topic}"</p>
      <p className="request-card__time">{request.requestedAt}</p>
      <div className="request-card__actions">
        <button type="button">Accept</button>
        <button type="button">Decline</button>
        <a href={`mailto:${request.email}`}>Message Student</a>
      </div>
    </article>
  )
}
