// Nazifa Ahmed (261112966)
// code added by Bonita Baladi (261097353)

import { useEffect, useState } from 'react'
import { formatTime24To12 } from '../utils/ownerSlotAdapters'
import '../styles/GroupMeeting.css'

// just makes yyyy-mm-dd look nice
function longDateText(ymd) {
  if (!ymd) return ''
  const d = new Date(ymd + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function GroupMeetingVote({ meetingId }) {
  const [info, setInfo] = useState(null)
  const [allTimes, setAllTimes] = useState([])
  const [myPicks, setMyPicks] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false) // added by Bonita (261097353)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!meetingId) return
    loadGroup()
  }, [meetingId])

  // added by Bonita (261097353) — silent=true skips resetting saved/success so post-save refresh doesn't flicker
  async function loadGroup(silent = false) {
    if (!silent) setLoading(true)
    setError('')
    if (!silent) setSuccess('')
    try {
      const response = await fetch(`/api/groupMeeting/${meetingId}`, { credentials: 'include' })
      if (!response.ok) {
        setError('Could not load this group meeting. Check that the link is correct.')
        return
      }
      const json = await response.json()
      setInfo(json.group)
      const slots = json.slots || []
      setAllTimes(slots)
      const myVotedIds = new Set(slots.filter((one) => one.i_voted).map((one) => one.id))
      setMyPicks(myVotedIds)
      // added by Bonita (261097353) — if user already has votes in DB, go straight to "saved" state
      // only update saved on initial load, not on silent refresh (handleSave manages saved after that)
      if (!silent) setSaved(myVotedIds.size > 0)
    } catch {
      setError('Request failed.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // added by Bonita (261097353) — only toggle checkbox; vote counts come from DB after save
  // Fixed: no longer double-counting
  function flipPick(slotId) {
    setMyPicks((before) => {
      const after = new Set(before)
      if (after.has(slotId)) after.delete(slotId)
      else after.add(slotId)
      return after
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const idsIAlreadyVoted = new Set(allTimes.filter((one) => one.i_voted).map((one) => one.id))
      const newIds = [...myPicks].filter((id) => !idsIAlreadyVoted.has(id))
      const idsToUndo = [...idsIAlreadyVoted].filter((id) => !myPicks.has(id))

      for (const id of idsToUndo) {
        await fetch(`/api/groupMeeting/${meetingId}/vote/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      }

      if (newIds.length > 0) {
        const response = await fetch(`/api/groupMeeting/${meetingId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ slot_ids: newIds }),
        })
        // added by Bonita (261097353) — read body once; calling .json() twice on the same Response always fails the second time
        const voteData = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(voteData.error || 'Could not save votes.')
          return
        }
        setSuccess('Your availability has been saved.')
        setSaved(true)
        // added by Bonita (261097353) — silent reload so counts update without flickering saved state
        await loadGroup(true)
        // Open mailto to notify the owner of the new vote
        if (voteData.notify) {
          const subj = encodeURIComponent(voteData.notify.subject)
          const body = encodeURIComponent(voteData.notify.body)
          window.open(`mailto:${voteData.notify.to}?subject=${subj}&body=${body}`, '_blank')
        }
      } else {
        // added by Bonita (261097353) — reload even when only removals happened so count decrements correctly
        setSuccess('Your availability has been saved.')
        setSaved(true)
        await loadGroup(true)
      }
    } catch {
      setError('Request failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="groupmeeting-empty">Loading group meeting…</p>
  if (error && !info) return <p className="groupmeeting-error">{error}</p>

  return (
    <div className="groupmeeting-card">
      <h2>{info?.name}</h2>
      <p>Select all the times that work for you. The organizer will pick the final time.</p>
      {info?.owner_name ? (
        <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.2rem' }}>
          Organized by {info.owner_name}
        </p>
      ) : null}

      <div className="groupmeeting-options" style={{ marginTop: '0.85rem' }}>
        {allTimes.map((slot) => (
          <label
            key={slot.id}
            className={`groupmeeting-option${myPicks.has(slot.id) ? ' groupmeeting-option--voted' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              className="groupmeeting-option__check"
              checked={myPicks.has(slot.id)}
              onChange={() => flipPick(slot.id)}
            />
            <div className="groupmeeting-option__info">
              <div className="groupmeeting-option__date">{longDateText(slot.slot_date)}</div>
              <div className="groupmeeting-option__time">
                {formatTime24To12(slot.start_time)} – {formatTime24To12(slot.end_time)}
              </div>
            </div>
            <span className="groupmeeting-option__votes">
              {slot.vote_count} vote{slot.vote_count !== 1 ? 's' : ''}
            </span>
          </label>
        ))}
      </div>

      {error ? <p className="groupmeeting-error">{error}</p> : null}
      {success ? <p className="groupmeeting-success">{success}</p> : null}

      {/* added by Bonita (261097353) — hide save button after saving, show tag + edit button instead */}
      <div className="groupmeeting-btn-row">
        {saved ? (
          <>
            <span className="groupmeeting-saved-tag">✓ Availability saved</span>
            <button
              type="button"
              className="groupmeeting-btn groupmeeting-btn--secondary"
              onClick={() => setSaved(false)}
            >
              Edit Your Vote
            </button>
          </>
        ) : (
          <button
            type="button"
            className="groupmeeting-btn groupmeeting-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {/* added by Bonita (261097353) — label changes after first vote */}
            {saving ? 'Saving…' : allTimes.some((s) => s.i_voted) ? 'Edit My Availability' : 'Save My Availability'}
          </button>
        )}
      </div>
    </div>
  )
}
