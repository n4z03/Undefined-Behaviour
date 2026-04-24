// code written by Rupneet (ID: 261096653)
// code added by Sophia (261149930)

function parseTimeFromSubject(subject) {
  if (!subject) return null
  const match = subject.match(/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s+-\s+(\d{2}:\d{2}(?::\d{2})?)\]/)
  if (!match) return null
  return { date: match[1], start: match[2], end: match[3] }
}

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
        {requests.length === 0 ? (
          <p className="recent-requests-preview__empty">No pending requests.</p>
        ) : (
          requests.map((request) => {
            const proposed = parseTimeFromSubject(request.subject)
            return (
              <article key={request.id} className="recent-requests-preview__item">
              <p><strong>{request.user_name}</strong> - {request.message}</p>
              {proposed ? (
              <span>Proposed: {proposed.date} — {proposed.start} to {proposed.end}</span>
              ) : null}
          </article>
            )
        })
        )}
      </div>
    </section>
  )
}
