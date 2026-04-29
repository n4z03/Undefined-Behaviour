// code written by Rupneet (ID: 261096653)
import '../styles/OwnerList.css'

export default function OwnerList({ owners, selectedOwnerId, onSelectOwner }) {
  return (
    <section className="owner-list">
      <h3>Instructors with Active Slots</h3>
      <div className="owner-list__items">
        {owners.map((owner) => (
          <button
            key={owner.id}
            type="button"
            className={`owner-list__item${owner.id === selectedOwnerId ? ' owner-list__item--active' : ''}`}
            onClick={() => onSelectOwner(owner.id)}
          >
            <span>{owner.name}</span>
            <small>{owner.email}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
