// Owner dashboard quick list of upcoming booked meetings

function truncate(text, maxLen = 56) {
  const value = String(text || '')
  if (value.length <= maxLen) return value
  return `${value.slice(0, maxLen - 1)}…`
}

export default function OwnerUpcomingMeetingsPreview({ meetings, onViewAll, onSelectMeeting }) {
  return (
    <section className="owner-upcoming-preview">
      <div className="owner-upcoming-preview__top">
        <h3>Upcoming Meetings</h3>
        <button type="button" onClick={onViewAll}>
          View All
        </button>
      </div>
      <div className="owner-upcoming-preview__list">
        {meetings.length === 0 ? (
          <p className="owner-upcoming-preview__empty">No upcoming meetings.</p>
        ) : (
          meetings.map((meeting) => (
            <button
              key={meeting.id}
              type="button"
              className="owner-upcoming-preview__item"
              onClick={() => onSelectMeeting(meeting)}
            >
              <p>
                <strong>{truncate(meeting.title)}</strong>
              </p>
              <span>
                {meeting.dateLabel} — {meeting.time} to {meeting.endTime}
              </span>
              {meeting.bookedBy ? (
                <span className="owner-upcoming-preview__who">Booked by {meeting.bookedBy}</span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </section>
  )
}
