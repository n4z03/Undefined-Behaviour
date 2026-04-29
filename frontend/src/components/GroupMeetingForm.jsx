// Nazifa Ahmed (261112966)
// Bonita Baladi (261097353)

import { useState } from 'react'
import '../styles/GroupMeeting.css'

// blank row for a new time option row
function blankTimeOption() {
  return { date: '', startTime: '09:00', endTime: '09:30' }
}

// bonita — added embedded, onCancel, and onRefresh props for use inside OwnerActionPanel
export default function GroupMeetingForm({ onCreated, embedded = false, onCancel, onRefresh }) {
  const [name, setName] = useState('')
  const [timeOptions, setTimeOptions] = useState([blankTimeOption()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  function changeTimeAt(index, field, value) {
    setTimeOptions((before) => before.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addAnotherTime() {
    setTimeOptions((before) => [...before, blankTimeOption()])
  }

  function removeTimeAt(index) {
    setTimeOptions((before) => before.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Please enter a meeting name.')
      return
    }
    for (const row of timeOptions) {
      if (!row.date) {
        setError('Please select a date for each time option.')
        return
      }
      if (!row.startTime || !row.endTime) {
        setError('Please enter a start and end time for each option.')
        return
      }
      if (row.startTime >= row.endTime) {
        setError('Start time must be before end time for each option.')
        return
      }
    }
    setLoading(true)
    try {
      const response = await fetch('/api/groupMeeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          slots: timeOptions.map((row) => ({
            slot_date: row.date,
            start_time: row.startTime + ':00',
            end_time: row.endTime + ':00',
          })),
        }),
      })
      const json = await response.json()
      if (!response.ok) {
        setError((json.errors && json.errors[0]) || json.error || 'Could not create meeting.')
        return
      }
      const url = `${window.location.origin}/#/user-dashboard?group=${json.group.id}`
      setShareUrl(url)
      // bonita — when embedded: auto-copy link and refresh calendar but stay on success screen
      if (embedded) {
        navigator.clipboard.writeText(url).catch(() => {})
        if (onRefresh) onRefresh()
      } else {
        if (onCreated) onCreated()
      }
    } catch {
      setError('Request failed. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function reset() {
    setShareUrl('')
    setName('')
    setTimeOptions([blankTimeOption()])
    setError('')
  }

  if (shareUrl) {
    // bonita — embedded: show simple inline message instead of full share card
    if (embedded) {
      return (
        <div className="groupmeeting--embedded">
          <h2>Meeting Created!</h2>
          <p>Link copied to clipboard.</p>
          <p className="groupmeeting--embedded-hint">For more details, go to <strong>Group Meetings</strong>.</p>
          <div className="groupmeeting-btn-row">
            <button type="button" className="groupmeeting-btn groupmeeting-btn--primary" onClick={onCancel ?? reset}>
              Done
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="groupmeeting-card">
        <h2>Group Meeting Created</h2>
        <p>Share this link with students so they can vote for a preferred time.</p>
        <div className="groupmeeting-share">
          <input readOnly value={shareUrl} onClick={(e) => e.target.select()} />
          <button type="button" className="groupmeeting-btn groupmeeting-btn--primary" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <div className="groupmeeting-btn-row">
          <button type="button" className="groupmeeting-btn groupmeeting-btn--secondary" onClick={reset}>
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'groupmeeting--embedded' : 'groupmeeting-card'}> {/* bonita — use embedded class so CSS overrides can scope to it */}
      <h2>New Group Meeting</h2>
      <p>Add the times you are available. Students vote for what works for them.</p>
      <form className="groupmeeting-form" onSubmit={handleSubmit}>
        <label>
          Meeting name
          <input
            type="text"
            placeholder="e.g. COMP 307 Project Review"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div>
          <p className="groupmeeting-slot-section-label">Available time options</p>
          <div className="groupmeeting-slot-list">
            {timeOptions.map((slot, i) => (
              <div key={i} className="groupmeeting-slot-row">
                <div className="groupmeeting-slot-header">
                  <span className="groupmeeting-slot-header__label">Time Option {i + 1}</span>
                  {timeOptions.length > 1 ? (
                    <button
                      type="button"
                      className="groupmeeting-btn groupmeeting-btn--ghost"
                      onClick={() => removeTimeAt(i)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <label>
                  Date
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => changeTimeAt(i, 'date', e.target.value)}
                  />
                </label>

                <div className="groupmeeting-slot-time-row">
                  <label>
                    Start time
                    <input
                      type="time"
                      className="groupmeeting-time-input"
                      value={slot.startTime}
                      onChange={(e) => changeTimeAt(i, 'startTime', e.target.value)}
                    />
                  </label>
                  <label>
                    End time
                    <input
                      type="time"
                      className="groupmeeting-time-input"
                      value={slot.endTime}
                      onChange={(e) => changeTimeAt(i, 'endTime', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="groupmeeting-btn-row">
            <button type="button" className="groupmeeting-btn groupmeeting-btn--secondary" onClick={addAnotherTime}>
              + Add Time Option
            </button>
          </div>
        </div>

        {error ? <p className="groupmeeting-error">{error}</p> : null}

        <div className="groupmeeting-btn-row">
          <button type="submit" className="groupmeeting-btn groupmeeting-btn--primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Group Meeting'}
          </button>
        </div>
        {/* bonita — cancel button shown when embedded in action panel */}
        {onCancel ? (
          <div className="groupmeeting-btn-row">
            <button type="button" className="groupmeeting-btn groupmeeting-btn--secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

