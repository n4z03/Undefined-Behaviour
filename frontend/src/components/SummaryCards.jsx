// code written by Rupneet (ID: 261096653)

import '../styles/SummaryCards.css'

export default function SummaryCards({ cards }) {
  return (
    <section className="summary-cards" aria-label="Owner summary metrics">
      {cards.map((card) => (
        <article key={card.id} className="summary-card">
          <p className="summary-card__label">{card.label}</p>
          <p className="summary-card__value">{card.value}</p>
          <p className="summary-card__note">{card.note}</p>
        </article>
      ))}
    </section>
  )
}
