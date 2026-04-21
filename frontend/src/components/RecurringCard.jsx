// code written by Rupneet (ID: 261096653)

import '../styles/RecurringCard.css'

export default function RecurringCard({ item }) {
  return (
    <article className="recurring-card">
      <div className="recurring-card__top">
        <h3>{item.title}</h3>
        <span className={`recurring-card__status recurring-card__status--${item.status.toLowerCase()}`}>{item.status}</span>
      </div>
      <p>{item.days}</p>
      <p>{item.timeRange}</p>
      <p>{item.weeks} weeks</p>
      <div className="recurring-card__actions">
        <button type="button">Edit</button>
        <button type="button">Deactivate</button>
        <button type="button">Delete</button>
      </div>
    </article>
  )
}
