// code written by Rupneet (ID: 261096653)
// Button functionalities added by Sophia (261149930)
// Nazifa Ahmed (261112966) - owner can change date/time on a slot + cancellation email functionality
// Bonita Baladi (261097353) - wired RecurringForm to POST /api/recurringSlots with controlled inputs, validation, and error/success feedback

import { useEffect, useState } from 'react'
import '../styles/OwnerActionPanel.css'
import { addMinutes, formatTime24To12, timeForInput, to24Hour } from '../utils/ownerSlotAdapters'
import CancelBookingCard from './CancelBookingCard'
import GroupMeetingForm from './GroupMeetingForm' // bonita — import real wired GroupMeetingForm to replace dummy GroupForm

function ActionButton({ children, onClick, kind = 'primary' }) {
  return (
    <button type="button" className={`owner-action-panel__btn owner-action-panel__btn--${kind}`} onClick={onClick}>
      {children}
    </button>
  )
}

function DefaultPanel({ onModeChange }) {
  return (
    <>
      <h2>Actions</h2>
      <p className="owner-action-panel__muted">Pick an action to start. Slot details will appear here when you select a calendar block.</p>
      <div className="owner-action-panel__stack">
        <ActionButton onClick={() => onModeChange('create')}>Create Slot</ActionButton>
        <ActionButton onClick={() => onModeChange('recurring')}>Start Recurring Office Hours</ActionButton>
        <ActionButton onClick={() => onModeChange('group')}>Start Group Meeting</ActionButton>
      </div>
    </>
  )
}

function slotStatusLabel(slot) {
  if (slot.isJoinedSlot) return 'Joined'
  if (slot.bookingStatus === 'Booked') return 'Booked'
  if (slot.bookingStatus === 'Draft') return 'Draft'
  return 'Available'
}

function slotHasBookings(slot) {
  const n = slot.bookingCount != null ? Number(slot.bookingCount) : 0
  if (n > 0) return true
  return slot.bookingStatus === 'Booked'
}

function openSlotCancelledMailto(affectedUsers, slot) {
  const emails = affectedUsers.map((u) => u && u.email).filter(Boolean)
  if (emails.length === 0) return
  const to = emails.join(',')
  const subject = encodeURIComponent('Your booking was cancelled')
  const body = encodeURIComponent(
    "Hi, your booking for this time was cancelled (the slot was removed or unpublished).\n\n" +
      `${slot.title}\n` +
      `${slot.dateLabel}, ${slot.time}–${slot.endTime}\n\n` +
      'Please book another time on McBook if you still need a meeting.\n',
  )
  const href = `mailto:${to}?subject=${subject}&body=${body}`
  window.open(href, '_blank', 'noopener,noreferrer')
}

function ownerSlotCancelDialogProps(action, s) {
  const booked = slotHasBookings(s)
  const timeRange = `${s.time} – ${s.endTime}`
  const rows = [
    { label: 'Title', value: s.title },
    { label: 'Date', value: s.dateLabel },
    { label: 'Time', value: timeRange },
  ]
  if (booked && s.bookedBy) {
    rows.push({ label: 'Booked by', value: s.bookedBy })
  }
  if (action === 'deactivate') {
    return {
      title: 'Deactivate this slot?',
      blurb:
        'This cancels all student bookings for this time. A draft email will open so you can notify them. They can rebook if you turn the slot on again.',
      infoRows: rows,
      hint: 'When you continue, your email app may open with a message for affected students.',
      keepLabel: 'Keep slot public',
      confirmLabel: 'Deactivate & notify',
    }
  }
  if (booked) {
    return {
      title: 'Remove this time?',
      blurb:
        'This removes the block from your calendar and cancels all student bookings. A draft email will open so you can notify them.',
      infoRows: rows,
      hint: 'When you continue, your email app may open with a message for students.',
      keepLabel: 'Keep slot',
      confirmLabel: 'Remove from calendar',
    }
  }
  return {
    title: 'Remove this time?',
    blurb: 'This block will disappear from your calendar. There are no student bookings on it.',
    infoRows: rows,
    hint: 'You can add a new office hour block later.',
    keepLabel: 'Keep it',
    confirmLabel: 'Remove',
  }
}

function SlotDetailsPanel({
  slot,
  currentOwnerName,
  currentOwnerEmail,
  onModeChange,
  onSlotCreated,
  onSlotPatched,
  onSlotDeleted,
}) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [editingWhen, setEditingWhen] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [visibilityErr, setVisibilityErr] = useState('');
  const [ownerCancelDialog, setOwnerCancelDialog] = useState(null)
  const [ownerCancelLoading, setOwnerCancelLoading] = useState(false)

  useEffect(() => {
    if (!slot) return
    setDateStr(slot.dateInput || '')
    setStartStr(slot.timeInputStart || '10:00')
    setEndStr(slot.timeInputEnd || '10:30')
    setSaveErr('')
    setEditingWhen(false)
    setVisibilityErr('')
    setOwnerCancelDialog(null)
  }, [slot])

  if (slot.isJoinedSlot) {
    return (
      <>
        <h2>{slot.title}</h2>
        <p className="owner-action-panel__muted">{slot.dateLabel}</p>

        <div className="owner-action-panel__details">
          <div className="owner-action-panel__detail-row">
            <span className="owner-action-panel__detail-label">Time</span>
            <span className="owner-action-panel__detail-value">
              {slot.time} – {slot.endTime}
            </span>
          </div>

          <div className="owner-action-panel__detail-row">
            <span className="owner-action-panel__detail-label">Status</span>
            <span className="owner-action-panel__detail-value">Joined</span>
          </div>
        </div>

        <p className="owner-action-panel__hint">
          This is a meeting you joined. You cannot edit or change its visibility.
        </p>

        <div className="owner-action-panel__slot-actions">
          <ActionButton
            kind="secondary"
            onClick={async () => {
              try {
                const res = await fetch(`/api/ownerSlots/${slot.originalSlotId}/book`, {
                  method: 'DELETE',
                  credentials: 'include',
                })

                const data = await res.json().catch(() => ({}))

                if (!res.ok) {
                  alert(data.error || 'Could not cancel booking')
                  return
                }

                if (data.host && data.cancelledSlot) {
                  const recipients = [data.host.email, currentOwnerEmail]
                    .filter(Boolean)
                    .filter((email, idx, arr) => arr.indexOf(email) === idx)
                    .join(',')
                  const subj = encodeURIComponent(`Cancellation: ${data.cancelledSlot.title}`)
                  const body = encodeURIComponent(
                    `Hi,\n\n${currentOwnerName || 'An owner'} has cancelled the owner-owner booking for "${data.cancelledSlot.title}" on ${data.cancelledSlot.slot_date} (${data.cancelledSlot.start_time} – ${data.cancelledSlot.end_time}).\n\nBest,\nMcBook`,
                  )
                  window.open(`mailto:${recipients}?subject=${subj}&body=${body}`, '_blank', 'noopener,noreferrer')
                }

                window.location.reload()
              } catch (e) {
                alert('Could not cancel booking')
              }
            }}
          >
            Cancel Booking
          </ActionButton>

          <button
            type="button"
            className="owner-action-panel__text-link"
            onClick={() => onModeChange('default')}
          >
            Clear Selection
          </button>
        </div>
      </>
    )
  }

  async function handleToggleVisibility() {
    const nextStatus = slot.visibility === 'Private' ? 'active' : 'private'
    if (nextStatus === 'private' && slotHasBookings(slot)) {
      setOwnerCancelDialog({ action: 'deactivate', slot })
      return
    }
    setVisibilityErr('')
    try {
      const response = await fetch(`/api/ownerSlots/${slot.backendId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setVisibilityErr(json.error || 'Could not update visibility')
        return
      }
      const affectedCount = (json.affectedUsers || []).length
      if (affectedCount > 0) openSlotCancelledMailto(json.affectedUsers, slot)
      if (nextStatus === 'private') {
        if (onSlotDeleted) {
          await onSlotDeleted({ affectedCount, reason: 'deactivate' })
        } else if (onSlotCreated) {
          await onSlotCreated()
        }
      } else if (onSlotCreated) {
        await onSlotCreated()
      }
      onModeChange('default')
    } catch (e) {
      console.error(e)
      setVisibilityErr('Could not update visibility')
    }
  }

  function openRemoveSlotDialog() {
    setDeleteErr('')
    setOwnerCancelDialog({ action: 'remove', slot })
  }

  async function handleConfirmOwnerCancel() {
    if (!ownerCancelDialog) return
    const { action, slot: theSlot } = ownerCancelDialog
    setOwnerCancelLoading(true)
    setDeleteErr('')
    setVisibilityErr('')
    try {
      if (action === 'remove') {
        const response = await fetch(`/api/ownerSlots/${theSlot.backendId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        const json = await response.json().catch(() => ({}))
        if (!response.ok) {
          setDeleteErr(json.error || "Couldn't remove that slot")
          return
        }
        const list = json.affectedUsers || []
        if (list.length) openSlotCancelledMailto(list, theSlot)
        if (onSlotDeleted) {
          await onSlotDeleted({ affectedCount: list.length, reason: 'delete' })
        } else if (onSlotCreated) {
          await onSlotCreated()
        }
        onModeChange('default')
      } else {
        const response = await fetch(`/api/ownerSlots/${theSlot.backendId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'private' }),
        })
        const json = await response.json().catch(() => ({}))
        if (!response.ok) {
          setVisibilityErr(json.error || 'Could not update visibility')
          return
        }
        const list = json.affectedUsers || []
        if (list.length) openSlotCancelledMailto(list, theSlot)
        if (onSlotDeleted) {
          await onSlotDeleted({ affectedCount: list.length, reason: 'deactivate' })
        } else if (onSlotCreated) {
          await onSlotCreated()
        }
        onModeChange('default')
      }
      setOwnerCancelDialog(null)
    } catch (e) {
      console.error(e)
      setDeleteErr("Something went wrong, try again.")
    } finally {
      setOwnerCancelLoading(false)
    }
  }

  function handleCloseOwnerCancel() {
    if (ownerCancelLoading) return
    setOwnerCancelDialog(null)
  }

  function resetWhenFields() {
    setDateStr(slot.dateInput || '')
    setStartStr(slot.timeInputStart || '10:00')
    setEndStr(slot.timeInputEnd || '10:30')
    setSaveErr('')
  }

  async function saveWhen() {
    setSaveErr('')
    if (!dateStr) {
      setSaveErr('Pick a date first')
      return
    }
    // server also validates
    const startParts = (startStr || '0:0').split(':').map((n) => parseInt(n, 10) || 0)
    const endParts = (endStr || '0:0').split(':').map((n) => parseInt(n, 10) || 0)
    const startMins = startParts[0] * 60 + startParts[1]
    const endMins = endParts[0] * 60 + endParts[1]
    if (endMins <= startMins) {
      setSaveErr('End has to be after start')
      return
    }
    // backend wanted HH:MM:SS for tests
    const withSecs = (t) => (t && t.length === 5 ? `${t}:00` : t)
    try {
      const response = await fetch(`/api/ownerSlots/${slot.backendId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slot_date: dateStr,
          start_time: withSecs(startStr),
          end_time: withSecs(endStr),
        }),
      })
      let json = {}
      try {
        json = await response.json()
      } catch (_) {
        // non-json error page or empty
      }
      if (!response.ok) {
        const msg = json.error || (json.errors && json.errors[0]) || 'Something went wrong'
        setSaveErr(msg)
        return
      }
      setEditingWhen(false)
      if (onSlotPatched && json.slot) onSlotPatched(json.slot)
      else if (onSlotCreated) await onSlotCreated()
    } catch (e) {
      console.error(e)
      setSaveErr("Didn't save, try again")
    }
  }

  // added by Sophia
  async function handleCopyInviteLink() {
    console.log('slot backendId:', slot.backendId)
    console.log('slot:', slot)
    try {
      const response = await fetch('/api/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label: slot.title, slot_id: slot.backendId })
      })
      const json = await response.json()
      setInviteUrl(json.invite_url)
      await navigator.clipboard.writeText(json.invite_url)
      setCopyMessage('Invite link copied to clipboard!')
      setTimeout(() => setCopyMessage(''), 3000)
    } catch (err) {
      console.error('Error generating invite link', err)
      setCopyMessage('Failed to generate invite link.')
    }
  }

  const isGroupMeeting = slot.slotType === 'group_meeting'

  return (
    <>
      <h2>{slot.title}</h2>
      <p className="owner-action-panel__muted">{slot.dateLabel}</p>

      <div className="owner-action-panel__details">
        <div className="owner-action-panel__detail-row">
          <span className="owner-action-panel__detail-label">Time</span>
          <span className="owner-action-panel__detail-value">
            {slot.time} – {slot.endTime}
          </span>
        </div>
        <div className="owner-action-panel__detail-row">
          <span className="owner-action-panel__detail-label">Visibility</span>
          <span className="owner-action-panel__detail-value">{slot.visibility}</span>
        </div>
        <div className="owner-action-panel__detail-row">
          <span className="owner-action-panel__detail-label">Status</span>
          <span className="owner-action-panel__detail-value">{slotStatusLabel(slot)}</span>
        </div>
        {slot.bookedBy ? (
          <div className="owner-action-panel__detail-row">
            <span className="owner-action-panel__detail-label">Booked by</span>
            <span className="owner-action-panel__detail-value">{slot.bookedBy}</span>
          </div>
        ) : null}
        {slot.recurringLabel ? (
          <div className="owner-action-panel__detail-row">
            <span className="owner-action-panel__detail-label">Recurring</span>
            <span className="owner-action-panel__detail-value">{slot.recurringLabel}</span>
          </div>
        ) : null}
        {editingWhen && !isGroupMeeting ? (
          <div className="owner-action-panel__form owner-action-panel__form--tight">
            <label>
              Date
              <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </label>
            <label>
              Start
              <input type="time" value={startStr} onChange={(e) => setStartStr(e.target.value)} />
            </label>
            <label>
              End
              <input type="time" value={endStr} onChange={(e) => setEndStr(e.target.value)} />
            </label>
          </div>
        ) : null}
        <div className="owner-action-panel__detail-block">
          <span className="owner-action-panel__detail-label">Invite link</span>
          <span className="owner-action-panel__detail-value owner-action-panel__detail-value--break">{inviteUrl || slot.inviteLink}</span>
        </div>
      </div>

      {editingWhen && !isGroupMeeting && saveErr ? (
        <p className="owner-action-panel__feedback owner-action-panel__feedback--error">{saveErr}</p>
      ) : null}
      {deleteErr ? <p className="owner-action-panel__feedback owner-action-panel__feedback--error">{deleteErr}</p> : null}
      {visibilityErr ? (
        <p className="owner-action-panel__feedback owner-action-panel__feedback--error">{visibilityErr}</p>
      ) : null}
      {slotHasBookings(slot) && !editingWhen ? (
        <p className="owner-action-panel__hint">
          If you deactivate, students lose this booking and must rebook if you publish the slot again.
        </p>
      ) : null}

      <div className="owner-action-panel__slot-actions">
        {editingWhen && !isGroupMeeting ? (
          <div className="owner-action-panel__row">
            <ActionButton onClick={saveWhen}>Save date & time</ActionButton>
            <ActionButton
              kind="ghost"
              onClick={() => {
                setEditingWhen(false)
                resetWhenFields()
              }}
            >
              Cancel
            </ActionButton>
          </div>
        ) : (
          <>
            {!isGroupMeeting ? (
              <ActionButton onClick={handleToggleVisibility}>
                {slot.visibility === 'Private' ? 'Activate Slot' : 'Deactivate Slot'}
              </ActionButton>
            ) : null}
            <div className="owner-action-panel__secondary-row">
              {!isGroupMeeting ? (
                <ActionButton kind="secondary" onClick={() => setEditingWhen(true)}>
                  Edit date & time
                </ActionButton>
              ) : null}
              <ActionButton kind="secondary" onClick={openRemoveSlotDialog}>
                Cancel
              </ActionButton>
              <ActionButton kind="secondary" onClick={handleCopyInviteLink}>{copyMessage || 'Copy Invite Link'}</ActionButton>
              {slot.bookedEmail && !isGroupMeeting ? (
                <ActionButton kind="secondary" onClick={() => window.open(`mailto:${slot.bookedEmail}`, '_blank')}>
                  Email Student
                </ActionButton>
              ) : null}
            </div>
          </>
        )}
        <button type="button" className="owner-action-panel__text-link" onClick={() => onModeChange('default')}>
          Clear Selection
        </button>
      </div>
      {ownerCancelDialog && ownerCancelDialog.slot ? (
        <CancelBookingCard
          {...ownerSlotCancelDialogProps(ownerCancelDialog.action, ownerCancelDialog.slot)}
          isLoading={ownerCancelLoading}
          onClose={handleCloseOwnerCancel}
          onConfirm={handleConfirmOwnerCancel}
        />
      ) : null}
    </>
  )
}

// RecurringForm wired to POST /api/recurringSlots — Bonita Baladi, 261097353
function RecurringForm({ onModeChange, onSlotCreated }) {
  const [title, setTitle] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [weeks, setWeeks] = useState(6)
  const [status, setStatus] = useState('private')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setError('')
    setSuccess('')
    if (!title.trim()) { setError('Title is required.'); return }
    if (!slotDate) { setError('Start date is required.'); return }
    if (!startTime || !endTime) { setError('Start and end time are required.'); return }
    if (startTime >= endTime) { setError('Start time must be before end time.'); return }
    if (!weeks || weeks < 1 || weeks > 52) { setError('Total number of weeks must be between 1 and 52.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/recurringSlots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          slot_date: slotDate,
          start_time: startTime,
          end_time: endTime,
          recurrence_weeks: Number(weeks),
          status,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || (data.errors && data.errors[0]) || 'Failed to create recurring slot.')
        return
      }
      const total = Number(data.total_occurrences || weeks)
      setSuccess(`Created! ${total} total occurrence(s) added to your calendar.`)
      if (onSlotCreated) await onSlotCreated()
      setTimeout(() => onModeChange('default'), 1500)
    } catch (e) {
      console.error(e)
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2>Recurring Office Hours</h2>
      <p className="owner-action-panel__muted">Set up a repeating block and review it in the weekly calendar.</p>
      <div className="owner-action-panel__form">
        <label>
          Title
          <input
            type="text"
            placeholder="Weekly Office Hours"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Start date (first occurrence)
          <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
        </label>
        <label>
          Start time
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label>
          End time
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label>
          Total number of weeks (including first week)
          <input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </label>
        <label>
          Visibility
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="private">Private</option>
            <option value="active">Public</option>
          </select>
        </label>
      </div>
      <p className="owner-action-panel__hint">
        Note: if you do not make the recurring office hours public right now, you will have to individually make each booking public in the future.
      </p>
      {error ? <p className="owner-action-panel__feedback owner-action-panel__feedback--error">{error}</p> : null}
      {success ? <p className="owner-action-panel__feedback owner-action-panel__feedback--success">{success}</p> : null}
      <div className="owner-action-panel__row">
        <ActionButton onClick={handleSave}>{loading ? 'Saving…' : 'Save Recurring Schedule'}</ActionButton>
        <ActionButton kind="ghost" onClick={() => onModeChange('default')}>
          Cancel
        </ActionButton>
      </div>
    </>
  )
}

function GroupForm({ onModeChange }) {
  return (
    <>
      <h2>Group Meeting Draft</h2>
      <p className="owner-action-panel__muted">Use the calendar to pick candidate times before finalizing the meeting.</p>
      <div className="owner-action-panel__form">
        <label>
          Meeting title
          <input type="text" placeholder="COMP 307 Project Review" />
        </label>
        <label>
          Invited users
          <input type="text" placeholder="4 invited" />
        </label>
        <label>
          Candidate time note
          <textarea rows="3" placeholder="Select two candidate blocks from Thursday and Friday afternoons." />
        </label>
      </div>
      <div className="owner-action-panel__row">
        <ActionButton>Create Group Meeting</ActionButton>
        <ActionButton kind="ghost" onClick={() => onModeChange('default')}>
          Cancel
        </ActionButton>
      </div>
    </>
  )
}

// Functionality edited by Sophia
function CreateSlotForm({ selectedCell, onModeChange, onSlotCreated }) {
  const [visibility, setVisibility] = useState('Private')
  const [title, setTitle] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [manualDate, setManualDate] = useState(selectedCell?.slotDate || selectedCell?.fullDate || '')
  const [manualStart, setManualStart] = useState('10:00')
  const [manualEnd, setManualEnd] = useState('10:30')

  useEffect(() => {
    if (!selectedCell) return
    const dateStr = selectedCell.slotDate || selectedCell.fullDate || ''
    setManualDate(dateStr)
    const start24 =
      selectedCell.startTime24 || (selectedCell.time ? to24Hour(selectedCell.time) : '10:00')
    const end24 = selectedCell.endTime24 || addMinutes(start24, 30)
    setManualStart(timeForInput(`${start24}:00`))
    setManualEnd(timeForInput(`${end24}:00`))
  }, [selectedCell])

  function missingFieldMessage() {
    if (!title.trim()) return 'Title is required and cannot be submitted empty.'
    if (!manualDate) return 'Date is required and cannot be submitted empty.'
    if (!manualStart) return 'Start time is required and cannot be submitted empty.'
    if (!manualEnd) return 'End time is required and cannot be submitted empty.'
    return ''
  }
  
  async function handleCreate() {
    setSubmitError('')
    setSubmitSuccess('')

    const missing = missingFieldMessage()
    if (missing) {
      setSubmitError(missing)
      return
    }

    if (manualStart >= manualEnd) {
      setSubmitError('End time must be later than start time.')
      return
    }

    try {
    const response = await fetch('/api/ownerSlots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({title, slot_date: manualDate, start_time: manualStart, end_time: manualEnd, 
            status: visibility === 'Public' ? 'active' : 'private',
          }),
      })

      if (!response.ok) {
        let data = null
        try {
          data = await response.json()
        } catch (_) {
          // ignore non-json responses
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Could not create slot. You may not be signed in as an owner.')
        }
        const serverMsg = data?.error || (Array.isArray(data?.errors) ? data.errors[0] : '')
        throw new Error(serverMsg || 'Could not create slot. Please check required fields and try again.')
      }

      const json = await response.json()
      setSubmitSuccess('Slot created successfully.')
      if (onSlotCreated) await onSlotCreated(json.slot)
      onModeChange('default')
    } catch (err) {
      setSubmitError(err.message || 'Could not create slot.')
    }
  }

  return (
    <>
      <h2>Create Slot</h2>
      <p className="owner-action-panel__muted">
        {selectedCell ? `Creating slot for ${selectedCell.day} at ${selectedCell.time}.` : 'Choose a day and time from the calendar, then fill details.'}
      </p>
      <div className="owner-action-panel__form">
        <label>
          Title
          <input
            type="text"
            placeholder="Office Hours"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Date
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)}/>
        </label>
        <label>
          Start Time
          <input type="time" step={60} value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
        </label>
        <label>
          End Time
          <input type="time" step={60} value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
        </label>
        <label>
          Visibility
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="Private">Private</option>
            <option value="Public">Public</option>
          </select>
        </label>
      </div>
      <div className="owner-action-panel__row">
        <ActionButton onClick={handleCreate}>{visibility === 'Public' ? 'Activate Slot' : 'Create Private Slot'}</ActionButton>
        <ActionButton kind="ghost" onClick={() => onModeChange('default')}>
          Cancel
        </ActionButton>
      </div>
      {submitError ? <p className="owner-action-panel__feedback owner-action-panel__feedback--error">{submitError}</p> : null}
      {submitSuccess ? <p className="owner-action-panel__feedback owner-action-panel__feedback--success">{submitSuccess}</p> : null}
    </>
  )
}

export default function OwnerActionPanel({
  panelMode,
  selectedSlot,
  selectedCell,
  currentOwnerName,
  currentOwnerEmail,
  onModeChange,
  onSlotCreated,
  onSlotPatched,
  onSlotDeleted,
}) {
  return (
    <aside className="owner-action-panel">
      {panelMode === 'slotDetails' && selectedSlot ? (
        <SlotDetailsPanel
          slot={selectedSlot}
          currentOwnerName={currentOwnerName}
          currentOwnerEmail={currentOwnerEmail}
          onModeChange={onModeChange}
          onSlotCreated={onSlotCreated}
          onSlotPatched={onSlotPatched}
          onSlotDeleted={onSlotDeleted}
        />
      ) : null}
      {panelMode === 'create' ? <CreateSlotForm selectedCell={selectedCell} onModeChange={onModeChange} onSlotCreated={onSlotCreated} /> : null}
      {panelMode === 'recurring' ? <RecurringForm onModeChange={onModeChange} onSlotCreated={onSlotCreated} /> : null}
      {/* bonita — replaced dummy GroupForm with real GroupMeetingForm; onCreated navigates back to default panel */}
      {panelMode === 'group' ? <GroupMeetingForm embedded onCreated={() => onModeChange('default')} onCancel={() => onModeChange('default')} /> : null}
      {panelMode === 'default' ? <DefaultPanel onModeChange={onModeChange} /> : null}
    </aside>
  )
}

