// Rupneet Shahriar (261096653)
// edit pending requests done by Nazifa Ahmed (261112966)
import { useEffect, useState } from 'react'
import '../styles/UserRequestCard.css'

function isServerRequestId(id) {
  return /^\d+$/.test(String(id).trim())
}

export default function UserRequestCard({ request, onUpdate, summaryOnly = false, onOpenRequests }) {
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState(request.message)
  const [proposedDate, setProposedDate] = useState(request.proposedDate)
  const [proposedStart, setProposedStart] = useState(request.proposedStart)
  const [proposedEnd, setProposedEnd] = useState(request.proposedEnd)
  const [lineSubject, setLineSubject] = useState(request.lineSubject)

  useEffect(() => {
    setMessage(request.message)
    setProposedDate(request.proposedDate)
    setProposedStart(request.proposedStart)
    setProposedEnd(request.proposedEnd)
    setLineSubject(request.lineSubject)
  }, [request])

  const isPending = request.status === 'Pending'
  const canEdit = isPending && isServerRequestId(request.id) && typeof onUpdate === 'function'
  const showTime = request.proposedDate
  const clickableSummary = summaryOnly && typeof onOpenRequests === 'function'

  return (
    <article
      className={`user-request-card${clickableSummary ? ' user-request-card--clickable' : ''}`}
      onClick={clickableSummary ? onOpenRequests : undefined}
      role={clickableSummary ? 'button' : undefined}
      tabIndex={clickableSummary ? 0 : undefined}
      onKeyDown={
        clickableSummary
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenRequests()
              }
            }
          : undefined
      }
    >
      <div className="user-request-card__top">
        <h3>{request.ownerName}</h3>
        {!summaryOnly ? (
          <span className={`user-request-card__status user-request-card__status--${request.status.toLowerCase()}`}>
            {request.status}
          </span>
        ) : null}
      </div>
      {canEdit && editing ? (
        <div className="user-request-card__edit">
          <label>
            Message
            <textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label>
            Optional title
            <input value={lineSubject} onChange={(e) => setLineSubject(e.target.value)} />
          </label>
          <label>
            Proposed date
            <input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} />
          </label>
          <div className="user-request-card__time-row">
            <label>
              From
              <input type="time" value={proposedStart} onChange={(e) => setProposedStart(e.target.value)} />
            </label>
            <label>
              To
              <input type="time" value={proposedEnd} onChange={(e) => setProposedEnd(e.target.value)} />
            </label>
          </div>
          <div className="user-request-card__edit-actions">
            <button
              type="button"
              className="user-request-card__save"
              onClick={async () => {
                const ok = await onUpdate(request.id, {
                  message,
                  proposedDate,
                  proposedStart,
                  proposedEnd,
                  subject: lineSubject,
                })
                if (ok) setEditing(false)
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="user-request-card__edit-cancel"
              onClick={() => {
                setEditing(false)
                setMessage(request.message)
                setProposedDate(request.proposedDate)
                setProposedStart(request.proposedStart)
                setProposedEnd(request.proposedEnd)
                setLineSubject(request.lineSubject)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {showTime ? (
            <div className="user-request-card__section">
              <p className="user-request-card__label">
                <strong>Proposed time</strong>
              </p>
              <p className="user-request-card__proposed">
                {request.proposedDate} · {request.proposedStart} – {request.proposedEnd}
              </p>
            </div>
          ) : null}
          <div className="user-request-card__section">
            <p className="user-request-card__body">
              <strong>Message:</strong> {request.message}
            </p>
          </div>
        </>
      )}
      {!summaryOnly ? (
        <p className="user-request-card__time">
          <span className="user-request-card__label-inline">Submission date</span>: {request.createdAt}
        </p>
      ) : null}
      {!summaryOnly && canEdit && !editing ? (
        <div className="user-request-card__row-actions">
          <button type="button" className="user-request-card__edit-btn" onClick={() => setEditing(true)}>
            Edit request
          </button>
        </div>
      ) : null}
    </article>
  )
}
