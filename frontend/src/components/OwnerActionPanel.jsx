// code written by Rupneet (ID: 261096653)
// button functionalities added by sophia
// Nazifa Ahmed (261112966) - owner can change date/time on a slot + cancellation email functionality

import { useEffect, useState } from 'react'
import '../styles/OwnerActionPanel.css'
import { addMinutes, buildCreateSlotPayload, formatTime24To12, to24Hour } from '../utils/ownerSlotAdapters'
import CancelBookingCard from './CancelBookingCard'

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

function SlotDetailsPanel({ slot, onModeChange, onSlotCreated, onSlotPatched, onSlotDeleted }) {
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

  async function handleToggleVisibility() {
    const nextStatus = slot.visibility === 'Private' ? 'active' : 'private'
    if (nextStatus === 'private' && slotHasBookings(slot)) {
      setOwnerCancelDialog({ action: 'deactivate', slot })
      return
    }
    setVisibilityErr('')
    try {
      const res = await fetch(`/api/ownerSlots/${slot.backendId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setVisibilityErr(data.error || 'Could not update visibility')
        return
      }
      const n = (data.affectedUsers || []).length
      if (n > 0) openSlotCancelledMailto(data.affectedUsers, slot)
      if (nextStatus === 'private') {
        if (onSlotDeleted) {
          await onSlotDeleted({ affectedCount: n, reason: 'deactivate' })
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
    const { action, slot: which } = ownerCancelDialog
    setOwnerCancelLoading(true)
    setDeleteErr('')
    setVisibilityErr('')
    try {
      if (action === 'remove') {
        const res = await fetch(`/api/ownerSlots/${which.backendId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setDeleteErr(data.error || "Couldn't remove that slot")
          return
        }
        const list = data.affectedUsers || []
        if (list.length) openSlotCancelledMailto(list, which)
        if (onSlotDeleted) {
          await onSlotDeleted({ affectedCount: list.length, reason: 'delete' })
        } else if (onSlotCreated) {
          await onSlotCreated()
        }
        onModeChange('default')
      } else {
        const res = await fetch(`/api/ownerSlots/${which.backendId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'private' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setVisibilityErr(data.error || 'Could not update visibility')
          return
        }
        const list = data.affectedUsers || []
        if (list.length) openSlotCancelledMailto(list, which)
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
    const a = (startStr || '0:0').split(':').map((x) => parseInt(x, 10) || 0)
    const b = (endStr || '0:0').split(':').map((x) => parseInt(x, 10) || 0)
    const startMins = a[0] * 60 + a[1]
    const endMins = b[0] * 60 + b[1]
    if (endMins <= startMins) {
      setSaveErr('End has to be after start')
      return
    }
    // backend wanted HH:MM:SS for tests
    const withSecs = (t) => (t && t.length === 5 ? `${t}:00` : t)
    try {
      const res = await fetch(`/api/ownerSlots/${slot.backendId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slot_date: dateStr,
          start_time: withSecs(startStr),
          end_time: withSecs(endStr),
        }),
      })
      let data = {}
      try {
        data = await res.json()
      } catch (_) {
        // non-json error page or empty
      }
      if (!res.ok) {
        const msg = data.error || (data.errors && data.errors[0]) || 'Something went wrong'
        setSaveErr(msg)
        return
      }
      setEditingWhen(false)
      if (onSlotPatched && data.slot) onSlotPatched(data.slot)
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
      const data = await response.json()
      setInviteUrl(data.invite_url)
      await navigator.clipboard.writeText(data.invite_url)
      setCopyMessage('Invite link copied to clipboard!')
      setTimeout(() => setCopyMessage(''), 3000)
    } catch (err) {
      console.error('Error generating invite link', err)
      setCopyMessage('Failed to generate invite link.')
    }
  }
  
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
        {editingWhen ? (
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

      {editingWhen && saveErr ? (
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
        {editingWhen ? (
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
            <ActionButton onClick={handleToggleVisibility}>
              {slot.visibility === 'Private' ? 'Activate Slot' : 'Deactivate Slot'}
            </ActionButton>
            <div className="owner-action-panel__secondary-row">
              <ActionButton kind="secondary" onClick={() => setEditingWhen(true)}>Edit date & time</ActionButton>
              <ActionButton kind="secondary" onClick={openRemoveSlotDialog}>
                Cancel
              </ActionButton>
              <ActionButton kind="secondary" onClick={handleCopyInviteLink}>{copyMessage || 'Copy Invite Link'}</ActionButton>
              {slot.bookedEmail ? (
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

function RecurringForm({ onModeChange }) {
  return (
    <>
      <h2>Recurring Office Hours</h2>
      <p className="owner-action-panel__muted">Set up a repeating block and review it in the weekly calendar.</p>
      <div className="owner-action-panel__form">
        <label>
          Title
          <input type="text" defaultValue="Weekly Office Hours" />
        </label>
        <label>
          Day(s)
          <input type="text" defaultValue="Monday, Wednesday" />
        </label>
        <label>
          Time
          <input type="text" defaultValue="3:00 PM - 4:00 PM" />
        </label>
        <label>
          Number of weeks
          <input type="number" defaultValue={6} />
        </label>
        <label>
          Visibility
          <select defaultValue="Private">
            <option>Private</option>
            <option>Public</option>
          </select>
        </label>
      </div>
      <div className="owner-action-panel__row">
        <ActionButton>Save Recurring Schedule</ActionButton>
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
          <input type="text" defaultValue="COMP 307 Project Review" />
        </label>
        <label>
          Invited users
          <input type="text" defaultValue="4 invited" />
        </label>
        <label>
          Candidate time note
          <textarea rows="3" defaultValue="Select two candidate blocks from Thursday and Friday afternoons." />
        </label>
      </div>
      <div className="owner-action-panel__row">
        <ActionButton>Save Draft</ActionButton>
        <ActionButton kind="ghost" onClick={() => onModeChange('default')}>
          Finalize Later
        </ActionButton>
      </div>
    </>
  )
}

// Functionality edited by Sophia
function CreateSlotForm({ selectedCell, onModeChange, onSlotCreated }) {
  const [visibility, setVisibility] = useState('Private')
  const [title, setTitle] = useState('Office Hours')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  async function handleCreate() {
    setSubmitError('')
    setSubmitSuccess('')
    try {
      const payload = buildCreateSlotPayload({
        title,
        visibility,
        selectedCell,
      })

      const response = await fetch('/api/ownerSlots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Could not create slot. You may not be signed in as an owner.')
        }
        throw new Error('Request failed. Check backend status and allowed frontend port.')
      }

      const data = await response.json()
      setSubmitSuccess('Slot created successfully.')
      if (onSlotCreated) await onSlotCreated(data.slot)
      onModeChange('default')
    } catch (err) {
      setSubmitError(err.message || 'Could not create slot.')
    }
  }

  const endTime = selectedCell?.time ? formatTime24To12(addMinutes(to24Hour(selectedCell.time), 30)) : ''

  return (
    <>
      <h2>Create Slot</h2>
      <p className="owner-action-panel__muted">
        {selectedCell ? `Creating slot for ${selectedCell.day} at ${selectedCell.time}.` : 'Choose a day and time from the calendar, then fill details.'}
      </p>
      <div className="owner-action-panel__form">
        <label>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Date
          <input type="text" value={selectedCell ? `${selectedCell.day}` : ''} readOnly />
        </label>
        <label>
          Time Range
          <input type="text" value={selectedCell ? `${selectedCell.time} - ${endTime}` : ''} readOnly />
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

export default function OwnerActionPanel({ panelMode, selectedSlot, selectedCell, onModeChange, onSlotCreated, onSlotPatched, onSlotDeleted }) {
  return (
    <aside className="owner-action-panel">
      {panelMode === 'slotDetails' && selectedSlot ? (
        <SlotDetailsPanel
          slot={selectedSlot}
          onModeChange={onModeChange}
          onSlotCreated={onSlotCreated}
          onSlotPatched={onSlotPatched}
          onSlotDeleted={onSlotDeleted}
        />
      ) : null}
      {panelMode === 'create' ? <CreateSlotForm selectedCell={selectedCell} onModeChange={onModeChange} onSlotCreated={onSlotCreated} /> : null}
      {panelMode === 'recurring' ? <RecurringForm onModeChange={onModeChange} /> : null}
      {panelMode === 'group' ? <GroupForm onModeChange={onModeChange} /> : null}
      {panelMode === 'default' ? <DefaultPanel onModeChange={onModeChange} /> : null}
    </aside>
  )
}
