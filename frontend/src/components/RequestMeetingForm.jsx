// Code written by Rupneet Shahriar (ID: 261096653)
// Code added by Nazifa Ahmed (261112966)
import { useEffect, useState } from 'react'
import '../styles/RequestMeetingForm.css'

function tomorrowYmd() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function splitPreferredTime(preferredTime) {
  const raw = String(preferredTime || '').trim()
  if (!raw) return { line1: '', line2: '' }
  const marker = ' at '
  const idx = raw.lastIndexOf(marker)
  if (idx === -1) return { line1: raw, line2: '' }
  return {
    line1: raw.slice(0, idx).trim(),
    line2: raw.slice(idx + marker.length).trim(),
  }
}

export default function RequestMeetingForm({
  owners = [],
  onSubmit,
  initialPreferredTime = '',
  initialProposedDate = '',
  initialProposedStart = '',
  initialProposedEnd = '',
  title = 'Request a Meeting',
  onCancel,
}) {
  const [ownerId, setOwnerId] = useState(owners[0]?.id || '')
  const [message, setMessage] = useState('')
  const [proposedDate, setProposedDate] = useState(tomorrowYmd)
  const [proposedStart, setProposedStart] = useState('10:00')
  const [proposedEnd, setProposedEnd] = useState('10:30')
  const [subject, setSubject] = useState('')
  const preferredTimeLines = splitPreferredTime(initialPreferredTime)

  useEffect(() => {
    if (owners[0]?.id) setOwnerId(owners[0].id)
  }, [owners])

  useEffect(() => {
    if (initialProposedDate) setProposedDate(initialProposedDate)
    if (initialProposedStart) setProposedStart(initialProposedStart)
    if (initialProposedEnd) setProposedEnd(initialProposedEnd)
  }, [initialProposedDate, initialProposedStart, initialProposedEnd])

  function handleSubmit(e) {
    e.preventDefault()
    if (!ownerId || !message.trim()) return
    onSubmit({
      ownerId,
      message: message.trim(),
      subject: subject.trim(),
      proposedDate,
      proposedStart,
      proposedEnd,
      preferredTime: initialPreferredTime,
    })
    setMessage('')
    setSubject('')
  }

  return (
    <form className="request-meeting-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {owners.length === 0 ? (
        <p className="request-meeting-form__note">
          No instructors with active slots are loaded yet. Make sure the server is running and at least one owner has
          a public (active) slot, then refresh.
        </p>
      ) : null}
      <label>
        Instructor
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Topic / message
        <textarea
          rows="3"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          placeholder="Can we review assignment 3 together?"
        />
      </label>
      <label>
        Short title (optional)
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Office hours follow-up"
        />
      </label>
      <label>
        Proposed date
        <input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} required />
      </label>
      <div className="request-meeting-form__time-row">
        <label>
          From
          <input type="time" value={proposedStart} onChange={(e) => setProposedStart(e.target.value)} required />
        </label>
        <label>
          To
          <input type="time" value={proposedEnd} onChange={(e) => setProposedEnd(e.target.value)} required />
        </label>
      </div>
      {initialPreferredTime ? (
        <p className="request-meeting-form__note">
          <span className="request-meeting-form__note-label">Calendar note:</span>
          <span className="request-meeting-form__note-value">
            {preferredTimeLines.line2
              ? `${preferredTimeLines.line1} at ${preferredTimeLines.line2}`
              : preferredTimeLines.line1}
          </span>
        </p>
      ) : null}
      <button type="submit" disabled={owners.length === 0}>
        Submit request
      </button>
      {onCancel ? (
        <button type="button" className="request-meeting-form__cancel" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  )
}
