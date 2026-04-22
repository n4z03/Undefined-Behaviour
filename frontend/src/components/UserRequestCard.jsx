import '../styles/UserRequestCard.css'

export default function UserRequestCard({ request }) {
  return (
    <article className="user-request-card">
      <div className="user-request-card__top">
        <h3>{request.ownerName}</h3>
        <span className={`user-request-card__status user-request-card__status--${request.status.toLowerCase()}`}>{request.status}</span>
      </div>
      <p>{request.message}</p>
      <p className="user-request-card__time">{request.createdAt}</p>
    </article>
  )
}
