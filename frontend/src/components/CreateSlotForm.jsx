// code written by Rupneet (ID: 261096653)
// some parts added by Sophia Casalme (261149930), Nazifa Ahmed (261112966)

import { useState } from 'react'
import { apiFetch } from '../api'
import '../styles/CreateSlotForm.css'

export default function CreateSlotForm() {
  const [isRecurring, setIsRecurring] = useState(false)
  // added by sophia
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [weeks, setWeeks] = useState(6)

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const response = await apiFetch('/api/ownerSlots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          slot_date: date,
          start_time: startTime,
          end_time: endTime,
          status: 'active',
          is_recurring: isRecurring,
          recurrence_weeks: isRecurring ? weeks : null
        })
      })
      const data = await response.json()
      console.log('Slot created', data)
    } catch (err) {
      console.error('Error creating slot', err)
    }
  }

  return (
    <section className="create-slot-card">
      <h3>Create Slot</h3>
      <p>All newly created slots remain private until activated.</p>
      <form className="create-slot-form" onSubmit={handleSubmit}>
        <label htmlFor="slot-title">Slot Title</label>
        <input id="slot-title" type="text" placeholder="Office Hours Slot" value={title} onChange={(e) => setTitle(e.target.value)}/>

        <label htmlFor="slot-date">Date</label>
        <input id="slot-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="create-slot-form__row">
          <div>
            <label htmlFor="slot-start">Start Time</label>
            <input id="slot-start" type="time" onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label htmlFor="slot-end">End Time</label>
            <input id="slot-end" type="time" onChange={(e) => setEndTime(e.target.value)} />
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
            <input id="slot-weeks" type="number" min="1" max="14" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
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
