// Nazifa Ahmed (261112966)
// invite link persistence added by Bonita Baladi (261097353)
// prof-to-prof group meeting join added by Bonita Baladi (261097353)
// group meeting UI changes code added by Rupneet (261096653)

import { useEffect, useState } from 'react'
import { formatTime24To12 } from '../utils/ownerSlotAdapters'
import '../styles/GroupMeeting.css'
import GroupMeetingVote from './GroupMeetingVote' // added by Bonita (261097353) — for prof-to-prof voting

// short date for the prof view
function showShortDate(ymd) {
  if (!ymd) return ''
  const d = new Date(ymd + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function GroupMeetingManager({ refreshKey = 0, onConfirmed }) {    //added by Rupneet (261096653)
  const [myMeetings, setMyMeetings] = useState([])
  const [openMeetingId, setOpenMeetingId] = useState(null)
  const [openedMeeting, setOpenedMeeting] = useState(null)
  const [groupsIAlreadyLockedIn, setGroupsIAlreadyLockedIn] = useState(new Set())
  const [timeImAboutToLock, setTimeImAboutToLock] = useState(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [weeks, setWeeks] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // added by Bonita — tracks whether the invite link was copied so we can show feedback
  const [linkCopied, setLinkCopied] = useState(false)
  // added by Bonita (261097353) — prof-to-prof: state for pasting a colleague's invite link
  const [joinLinkInput, setJoinLinkInput] = useState('')
  const [joinLinkError, setJoinLinkError] = useState('')
  const [joinGroupId, setJoinGroupId] = useState(null)

  useEffect(() => {
    loadGroups()
  }, [refreshKey])

  // While a meeting is open and not yet confirmed, poll every 5s so the prof
  // sees new votes roll in without having to close and re-open the meeting.
  // Skipped once the meeting is confirmed (status='active' on a slot) — no more
  // votes are coming, no need to keep hitting the server.
  useEffect(() => {
    if (!openMeetingId) return
    const alreadyConfirmed = (openedMeeting?.slots || []).some((s) => s.status === 'active')
    if (alreadyConfirmed) return

    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/groupMeeting/${openMeetingId}`, { credentials: 'include' })
        if (!r.ok) return
        const json = await r.json()
        setOpenedMeeting(json)
      } catch {
        /* network blip — next tick will retry */
      }
      // also refresh the list-level vote totals shown on the meeting tiles
      loadGroups()
    }, 5000)
    return () => clearInterval(id)
  }, [openMeetingId, openedMeeting])

  async function loadGroups() {
    try {
      const response = await fetch('/api/groupMeeting', { credentials: 'include' })
      if (!response.ok) return
      const json = await response.json()
      setMyMeetings(json.groups || [])
    } catch (e) {
      console.error('Could not load group meetings', e)
    }
  }

  async function openMeetingById(groupId) {
    if (openMeetingId === groupId) {
      // added by Rupneet (261096653)
      setOpenMeetingId(null)
      setOpenedMeeting(null)
      setTimeImAboutToLock(null)
      setError('')
      setSuccess('')
      return
    }
    setOpenMeetingId(groupId)
    setTimeImAboutToLock(null)
    setError('')
    setSuccess('')
    setOpenedMeeting(null)
    // added by Bonita — reset copy feedback when switching meetings
    setLinkCopied(false)
    try {
      const response = await fetch(`/api/groupMeeting/${groupId}`, { credentials: 'include' })
      if (!response.ok) return
      const json = await response.json()
      setOpenedMeeting(json)
      const timeAlreadyPicked = (json.slots || []).some((opt) => opt.status === 'active')
      if (timeAlreadyPicked) {
        setGroupsIAlreadyLockedIn((before) => new Set([...before, groupId]))
      }
    } catch (e) {
      console.error('Could not load group detail', e)
    }
  }

  // this runs when prof clicks the real confirm on a time
  async function handleConfirm() {
    if (!timeImAboutToLock || !openMeetingId) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/groupMeeting/${openMeetingId}/confirm/${timeImAboutToLock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          is_recurring: isRecurring,
          recurrence_weeks: isRecurring ? Number(weeks) : null,
        }),
      })
      const json = await response.json()
      if (!response.ok) {
        setError(json.error || 'Could not confirm this slot.')
        return
      }
      const howMany = json.booked_users?.length || 0
      setSuccess(`Confirmed! ${howMany} student${howMany !== 1 ? 's' : ''} booked.`)
      setTimeImAboutToLock(null)
      if (json.notify && json.notify.length > 0) {
        const first = json.notify[0]
        const allEmails = json.notify.map((line) => line.to).join(',')
        window.location.href = `mailto:${allEmails}?subject=${encodeURIComponent(first.subject)}&body=${encodeURIComponent(first.body)}`
      }
      await loadGroups()
      await openMeetingById(openMeetingId)
      if (typeof onConfirmed === 'function') {
        await onConfirmed()
      }
    } catch {
      setError('Request failed.')
    } finally {
      setLoading(false)
    }
  }

  // added by Bonita — copies the invite link and shows feedback for 2 seconds
  function handleCopyInviteLink() {
    const link = `${window.location.origin}/#/user-dashboard?group=${openMeetingId}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {
      // fallback if clipboard API fails
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  // added by Bonita (261097353) — parse group ID from a pasted invite URL (supports hash and normal routes)
  function parseGroupIdFromUrl(urlStr) {
    try {
      const url = new URL(urlStr.trim())
      const hash = url.hash || ''
      if (hash.includes('?')) {
        const gid = new URLSearchParams(hash.slice(hash.indexOf('?'))).get('group')
        if (gid) return Number(gid)
      }
      const gid = url.searchParams.get('group')
      return gid ? Number(gid) : null
    } catch {
      return null
    }
  }

  // added by Bonita (261097353) — handle Go button for joining another prof's group meeting
  function handleJoinLinkSubmit() {
    setJoinLinkError('')
    const gid = parseGroupIdFromUrl(joinLinkInput)
    if (!gid) {
      setJoinLinkError('No group ID found. Make sure you paste the full invite link.')
      return
    }
    setJoinGroupId(gid)
    setJoinLinkInput('')
  }

  // either show the "already picked" green banner, or the vote list + confirm box
  function showDetailOrBanner() {
    if (!openedMeeting) return null
    const thePickedTime = openedMeeting.slots.find((opt) => opt.status === 'active')
    if (thePickedTime) {
      return (
        <div className="groupmeeting-confirmed-banner">
          <span className="groupmeeting-confirmed-banner__icon">✓</span>
          <div>
            <p className="groupmeeting-confirmed-banner__label">Meeting confirmed</p>
            <p className="groupmeeting-confirmed-banner__time">
              {showShortDate(thePickedTime.slot_date)} · {formatTime24To12(thePickedTime.start_time)} –{' '}
              {formatTime24To12(thePickedTime.end_time)}
              {thePickedTime.is_recurring
                ? ` · Repeating ${thePickedTime.recurrence_weeks} week${thePickedTime.recurrence_weeks !== 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
        </div>
      )
    }

    return (
      <>
        <p className="groupmeeting-section-label">{openedMeeting.group.name} — responses</p>

        {/* added by Bonita — persistent invite link so prof can reshare without losing it */}
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600 }}>
            Invite link — share with students to vote:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              readOnly
              value={`${window.location.origin}/#/user-dashboard?group=${openMeetingId}`}
              style={{
                flex: 1,
                fontSize: '0.78rem',
                padding: '0.3rem 0.5rem',
                border: '1px solid #d0d0d0',
                borderRadius: '6px',
                background: '#f9f9f9',
                color: '#444',
              }}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="groupmeeting-btn groupmeeting-btn--secondary"
              style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}
              onClick={handleCopyInviteLink}
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        {/* end added by Bonita */}

        <div className="groupmeeting-options">
          {openedMeeting.slots.map((slot) => (
            <div key={slot.id} className="groupmeeting-option">
              <div className="groupmeeting-option__info">
                <div className="groupmeeting-option__date">{showShortDate(slot.slot_date)}</div>
                <div className="groupmeeting-option__time">
                  {formatTime24To12(slot.start_time)} – {formatTime24To12(slot.end_time)}
                </div>
              </div>
              <span className="groupmeeting-option__votes">
                {slot.vote_count} vote{slot.vote_count !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="groupmeeting-btn groupmeeting-btn--secondary"
                onClick={() => {
                  setTimeImAboutToLock(slot)
                  setIsRecurring(false)
                  setWeeks(2)
                  setError('')
                  setSuccess('')
                }}
              >
                Confirm
              </button>
            </div>
          ))}
        </div>

        {timeImAboutToLock ? (
          <div className="groupmeeting-confirm-box">
            <p className="groupmeeting-confirm-box__slot">
              Confirming: {showShortDate(timeImAboutToLock.slot_date)},{' '}
              {formatTime24To12(timeImAboutToLock.start_time)} – {formatTime24To12(timeImAboutToLock.end_time)}
            </p>
            <label>
              <input
                type="radio"
                checked={!isRecurring}
                onChange={() => setIsRecurring(false)}
              />
              One-time meeting
            </label>
            <label>
              <input
                type="radio"
                checked={isRecurring}
                onChange={() => setIsRecurring(true)}
              />
              Recurring meeting
            </label>
            {isRecurring ? (
              <label>
                Number of weeks
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                />
              </label>
            ) : null}
            <div className="groupmeeting-btn-row">
              <button
                type="button"
                className="groupmeeting-btn groupmeeting-btn--primary"
                disabled={loading}
                onClick={handleConfirm}
              >
                {loading ? 'Confirming…' : 'Yes, Confirm'}
              </button>
              <button
                type="button"
                className="groupmeeting-btn groupmeeting-btn--secondary"
                onClick={() => setTimeImAboutToLock(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="groupmeeting-error">{error}</p> : null}
        {success ? <p className="groupmeeting-success">{success}</p> : null}
      </>
    )
  }

  return (
    <div className="groupmeeting-card">

      {/* added by Bonita (261097353) — prof-to-prof: join a colleague's group meeting via invite link */}
      <h2>Join a Colleague's Group Meeting</h2>
      <p style={{ marginBottom: '0.7rem' }}>
        Paste an invite link from another professor to vote on their meeting times.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
        <input
          type="text"
          placeholder="e.g. http://localhost:5173/user-dashboard?group=4"
          value={joinLinkInput}
          onChange={(e) => setJoinLinkInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleJoinLinkSubmit() }}
          style={{ flex: 1, padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #d3d3d3', font: 'inherit', fontSize: '0.88rem' }}
        />
        <button
          type="button"
          className="groupmeeting-btn groupmeeting-btn--primary"
          onClick={handleJoinLinkSubmit}
          style={{ whiteSpace: 'nowrap' }}
        >
          Go
        </button>
      </div>
      {joinLinkError ? (
        <p className="groupmeeting-error" style={{ marginTop: '0.4rem' }}>{joinLinkError}</p>
      ) : null}
      {/* added by Bonita (261097353) — render vote UI when a colleague's group ID is loaded */}
      {joinGroupId ? <GroupMeetingVote meetingId={joinGroupId} /> : null}

      <hr className="groupmeeting-divider" style={{ margin: '1.2rem 0' }} />
      {/* end added by Bonita */}

      <h2>Your Group Meetings</h2>
      <p>Select a meeting to review vote counts and confirm a time.</p>

      {myMeetings.length === 0 ? (
        <p className="groupmeeting-empty">No group meetings yet. Create one to get started.</p>
      ) : (
        <div className="groupmeeting-group-list">
          {myMeetings.map((oneMeeting) => (
            <button
              key={oneMeeting.id}
              type="button"
              className={`groupmeeting-group-item${openMeetingId === oneMeeting.id ? ' groupmeeting-group-item--selected' : ''}`}
              aria-pressed={openMeetingId === oneMeeting.id}
              onClick={() => openMeetingById(oneMeeting.id)}
            >
              <div className="groupmeeting-group-item__name">
                {oneMeeting.name}
                {groupsIAlreadyLockedIn.has(oneMeeting.id) ? (
                  <span className="groupmeeting-group-item__badge">Confirmed</span>
                ) : null}
              </div>
              <div className="groupmeeting-group-item__meta">
                {oneMeeting.total_slots} time option{oneMeeting.total_slots !== 1 ? 's' : ''} ·{' '}
                {oneMeeting.total_voters} response{oneMeeting.total_voters !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {openedMeeting ? (
        <>
          <hr className="groupmeeting-divider" />
          {showDetailOrBanner()}
        </>
      ) : null}
    </div>
  )
}
