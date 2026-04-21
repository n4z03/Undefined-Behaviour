// code written by Rupneet (ID: 261096653)

import '../styles/GroupMeetingCard.css'

export default function GroupMeetingCard({ meeting }) {
  return (
    <article className="group-card">
      <div className="group-card__top">
        <h3>{meeting.title}</h3>
        <span className="group-card__status">{meeting.status}</span>
      </div>
      <p>{meeting.invitees} invitees</p>
      <p>{meeting.possibleTimes} possible slots selected</p>
      <div className="group-card__actions">
        <button type="button">View Availability</button>
        <button type="button">Finalize Meeting</button>
        <button type="button">Edit</button>
      </div>
    </article>
  )
}
