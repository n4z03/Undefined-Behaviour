import { useEffect, useState } from 'react'
import '../styles/RequestMeetingForm.css'

export default function RequestMeetingForm({ owners, onSubmit, initialPreferredTime = '', title = 'Request a Meeting', onCancel }) {
  const [ownerId, setOwnerId] = useState(owners[0]?.id || '')
  const [message, setMessage] = useState('')
  const [preferredTime, setPreferredTime] = useState(initialPreferredTime)

  useEffect(() => {
    setPreferredTime(initialPreferredTime || '')
  }, [initialPreferredTime])

  function handleSubmit(e) {
    e.preventDefault()
    if (!ownerId || !message.trim()) return
    onSubmit({
      ownerId,
      message: message.trim(),
      preferredTime: preferredTime.trim(),
    })
    setMessage('')
    setPreferredTime('')
  }

  return (
    <form className="request-meeting-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <label>
        Owner
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Topic / Message
        <textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Can we review assignment 3 together?" />
      </label>
      <label>
        Preferred Date/Time (optional)
        <input value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="Tuesday after 2:00 PM" />
      </label>
      <button type="submit">Submit Request</button>
      {onCancel ? (
        <button type="button" className="request-meeting-form__cancel" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  )
}
