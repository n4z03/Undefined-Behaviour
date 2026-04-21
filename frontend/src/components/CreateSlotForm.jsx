// code written by Rupneet (ID: 261096653)

import { useState } from 'react'
import '../styles/CreateSlotForm.css'

export default function CreateSlotForm() {
  const [isRecurring, setIsRecurring] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
  }

  return (
    <section className="create-slot-card">
      <h3>Create Slot</h3>
      <p>All newly created slots remain private until activated.</p>
      <form className="create-slot-form" onSubmit={handleSubmit}>
        <label htmlFor="slot-title">Slot Title</label>
        <input id="slot-title" type="text" placeholder="Office Hours Slot" />

        <label htmlFor="slot-date">Date</label>
        <input id="slot-date" type="date" />

        <div className="create-slot-form__row">
          <div>
            <label htmlFor="slot-start">Start Time</label>
            <input id="slot-start" type="time" />
          </div>
          <div>
            <label htmlFor="slot-end">End Time</label>
            <input id="slot-end" type="time" />
          </div>
        </div>

        <label htmlFor="slot-visibility">Visibility</label>
        <select id="slot-visibility" defaultValue="Private">
          <option>Private</option>
          <option>Public</option>
        </select>

        <label className="create-slot-form__check">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          Repeat weekly
        </label>

        {isRecurring ? (
          <>
            <label htmlFor="slot-weeks">Number of Weeks</label>
            <input id="slot-weeks" type="number" min="1" max="14" defaultValue="6" />
          </>
        ) : null}

        <div className="create-slot-form__actions">
          <button type="button">Save as Private</button>
          <button type="submit">Activate Slot</button>
        </div>
      </form>
    </section>
  )
}
