// code written by Rupneet (ID: 261096653)

export default function RecentRequestsPreview({ requests, onViewAll }) {
  return (
    <section className="recent-requests-preview">
      <div className="recent-requests-preview__top">
        <h3>Pending Requests</h3>
        <button type="button" onClick={onViewAll}>
          View All
        </button>
      </div>
      <div className="recent-requests-preview__list">
        {requests.map((request) => (
          <article key={request.id} className="recent-requests-preview__item">
            <p>
              <strong>{request.name}</strong> - {request.topic}
            </p>
            <span>{request.requestedAt}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
