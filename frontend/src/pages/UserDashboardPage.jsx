// Rupneet Shahriar (261096653)
// Code added by Nazifa Ahmed (261112966)

import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'
import WeeklyCalendar from '../components/WeeklyCalendar'
import ExportPanel from '../components/ExportPanel'
import OwnerList from '../components/OwnerList'
import AvailableSlotCard from '../components/AvailableSlotCard'
import AppointmentCard from '../components/AppointmentCard'
import CancelBookingCard from '../components/CancelBookingCard'
import RequestMeetingForm from '../components/RequestMeetingForm'
import UserRequestCard from '../components/UserRequestCard'
import { userSidebarSections, owners, requestSeed } from '../data/userDashboardData'
import { timeRows, weekDays } from '../data/ownerDashboardData'
import { formatTime24To12 } from '../utils/ownerSlotAdapters'
import '../styles/UserDashboardPage.css'
import { useNavigate, useSearchParams } from 'react-router-dom'

function firstNameFromName(name) {
  const first = String(name || '').trim().split(/\s+/)[0]
  return first || 'User'
}

// Nazifa Ahmed (261112966)
function dateLabelFromDb(slotDate) {
  if (!slotDate) return ''
  const d = new Date(`${slotDate}T12:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// Nazifa Ahmed (261112966)
function mapApiSlotToBrowse(row) {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    title: row.title,
    dateLabel: dateLabelFromDb(row.slot_date),
    timeRange: `${formatTime24To12(row.start_time)} - ${formatTime24To12(row.end_time)}`,
    status: 'Available',
    visibility: 'Public',
    recurringLabel: Number(row.is_recurring) === 1 ? 'Recurring' : null,
  }
}

function buildBrowseOwnersFromRows(slotRows) {
  const m = new Map()
  for (const row of slotRows) {
    const id = String(row.owner_id)
    if (!m.has(id)) m.set(id, { id, name: row.owner_name, email: row.owner_email })
  }
  return Array.from(m.values())
}

// Nazifa Ahmed (261112966)
function mapApiBookingToAppointment(row) {
  return {
    id: String(row.booking_id),
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    title: row.title,
    dateLabel: dateLabelFromDb(row.slot_date),
    timeRange: `${formatTime24To12(row.start_time)} - ${formatTime24To12(row.end_time)}`,
    status: 'Confirmed',
    recurringLabel: Number(row.is_recurring) === 1 ? 'Recurring' : null,
  }
}

// finding the ids using numeric string ids - nazifa
function isServerBookingId(id) {
  if (id == null || id === '') return false
  return /^\d+$/.test(String(id).trim())
}

export default function UserDashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeSection, setActiveSection] = useState('overview')
  const [userName, setUserName] = useState('User')
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [browseOwners, setBrowseOwners] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [browseSlotsLoading, setBrowseSlotsLoading] = useState(true)
  const [browseSlotsError, setBrowseSlotsError] = useState(null)
  // Nazifa Ahmed (261112966) — real bookings loaded from API; seed only used as fallback shape reference
  const [appointments, setAppointments] = useState([])
  const [requests, setRequests] = useState(requestSeed)
  const [selectedCalendarAppointmentId, setSelectedCalendarAppointmentId] = useState(null)
  const [selectedFreeSlotCell, setSelectedFreeSlotCell] = useState(null)
  const [inviteSlots, setInviteSlots] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  // Nazifa Ahmed (261112966)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Load only after we know a student is logged in.
  // avoids any issues with 401 errors when there is no session
  const loadMyBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      setAppointments((data.bookings || []).map(mapApiBookingToAppointment))
    } catch (e) {
      console.error('Could not load bookings:', e)
    }
  }, [])

  const loadAvailableSlots = useCallback(async () => {
    setBrowseSlotsError(null)
    setBrowseSlotsLoading(true)
    try {
      const response = await fetch('/api/bookings/available-slots', { credentials: 'include' })
      if (response.status === 401) {
        setAvailableSlots([])
        setBrowseOwners([])
        return
      }
      if (!response.ok) {
        setBrowseSlotsError('Could not load available slots.')
        setAvailableSlots([])
        setBrowseOwners([])
        return
      }
      const data = await response.json()
      const rows = data.slots || []
      setAvailableSlots(rows.map(mapApiSlotToBrowse))
      const next = buildBrowseOwnersFromRows(rows)
      setBrowseOwners(next)
      if (next.length > 0) {
        setSelectedOwnerId((cur) => (cur && next.some((o) => o.id === cur) ? cur : next[0].id))
      }
    } catch (e) {
      console.error('Could not load available slots:', e)
      setBrowseSlotsError('Could not load available slots.')
      setAvailableSlots([])
      setBrowseOwners([])
    } finally {
      setBrowseSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancel = false
    async function init() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (cancel) return
        if (response.status === 401) {
          setBrowseSlotsLoading(false)
          setAvailableSlots([])
          setBrowseOwners([])
          navigate('/auth?mode=login&redirect=/user-dashboard', { replace: true })
          return
        }
        if (!response.ok) {
          setBrowseSlotsLoading(false)
          return
        }
        const data = await response.json()
        const role = data?.user?.role
        if (role === 'owner') {
          navigate('/owner-dashboard', { replace: true })
          setBrowseSlotsLoading(false)
          return
        }
        if (role === 'user') {
          setUserName(firstNameFromName(data?.user?.name))
          await loadMyBookings()
          if (cancel) return
          await loadAvailableSlots()
        } else {
          setBrowseSlotsLoading(false)
        }
      } catch {
        if (!cancel) {
          setUserName('User')
          setBrowseSlotsLoading(false)
        }
      }
    }
    init()
    return () => {
      cancel = true
    }
  }, [navigate, loadMyBookings, loadAvailableSlots])

  useEffect (() => {
    const inviteToken = searchParams.get('invite')
    if (!inviteToken) return 
    async function fetchInviteSlots() {
      try {
        const response = await fetch(`/api/invites/${inviteToken}`, {
          credentials: 'include'
        })
        if (response.status === 401) {
          const slotId = searchParams.get('slot')
          navigate(`/auth?mode=login&redirect=/user-dashboard?invite=${inviteToken}${slotId ? `%26slot=${slotId}` : ''}`)
          return
        }
        if (!response.ok) return
        const data = await response.json()
        const slotId = searchParams.get('slot')
        const filtered = slotId ? data.slots.filter(s => s.id === Number(slotId)) : data.slots
        setInviteSlots(filtered || [])
        setShowInviteModal(true)
      } catch (err) {
        console.error('Error fetching invite slots', err)
      }
    }
    fetchInviteSlots()
  }, [searchParams])

  async function handleSidebarSelect(sectionId) {
    if (sectionId === 'logout') {
      await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
      navigate('/auth?mode=login')
      return
    }
    setActiveSection(sectionId)
    setSelectedCalendarAppointmentId(null)
    setSelectedFreeSlotCell(null)
  }

  async function handleBookSlot(slotId) {
    const slot = availableSlots.find((item) => item.id === slotId)
    if (!slot) return
    // added by nazifa
    const numericSlotId = parseInt(String(slotId), 10)
    if (!Number.isInteger(numericSlotId) || numericSlotId <= 0) {
      window.alert('This listing is not linked to a server slot. Refresh the page after running the server and seed script.')
      return
    }
    try {
      const response = await fetch(`/api/bookings/book-slot/${numericSlotId}`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        window.alert(data.error || 'Could not book this slot.')
        return
      }
      await loadMyBookings()
      await loadAvailableSlots()
    } catch (e) {
      console.error(e)
      window.alert('Could not book this slot.')
    }
  }

  // Added by Nazifa
  function requestCancel(appointmentOrId) {
    const appt =
      typeof appointmentOrId === 'object' && appointmentOrId != null && 'id' in appointmentOrId
        ? appointmentOrId
        : appointments.find((item) => item.id === String(appointmentOrId))
    if (appt) setCancelTarget(appt)
  }

  // Added by Nazifa
  async function confirmCancelBooking() {
    if (!cancelTarget) return
    setCancelLoading(true)
    const appointment = cancelTarget
    const sendMailto = () => {
      const subj = encodeURIComponent(`Cancelled: ${appointment.title}`)
      const body = encodeURIComponent(
        `Hi ${appointment.ownerName},\n\nI have cancelled my booking for "${appointment.title}" on ${appointment.dateLabel} (${appointment.timeRange}).\n\n— ${userName}`,
      )
      window.location.href = `mailto:${appointment.ownerEmail}?subject=${subj}&body=${body}`
    }
    try {
      // "appt-…" and other non-numeric ids are not database booking rows — only update the UI
      if (!isServerBookingId(appointment.id)) {
        setAppointments((c) => c.filter((a) => a.id !== appointment.id))
        setSelectedCalendarAppointmentId(null)
        setCancelTarget(null)
        sendMailto()
        return
      }
      const response = await fetch(`/api/bookings/${appointment.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        window.alert(err.error || 'Unable to cancel this booking. Please try again.')
        return
      }
      await loadMyBookings()
      await loadAvailableSlots()
      setSelectedCalendarAppointmentId(null)
      setCancelTarget(null)
      sendMailto()
    } catch (e) {
      console.error(e)
      window.alert('Unable to complete the cancellation. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

  function handleSubmitRequest(payload) {
    const owner = owners.find((item) => item.id === payload.ownerId)
    if (!owner) return

    const fullMessage = payload.preferredTime
      ? `${payload.message} (Preferred: ${payload.preferredTime})`
      : payload.message

    setRequests((current) => [
      {
        id: `req-${Date.now()}`,
        ownerName: owner.name,
        ownerEmail: owner.email,
        message: fullMessage,
        status: 'Pending',
        createdAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      },
      ...current,
    ])
    setSelectedFreeSlotCell(null)
  }

  const visibleOwnerSlots = useMemo(
    () => availableSlots.filter((slot) => slot.ownerId === selectedOwnerId && slot.visibility === 'Public'),
    [availableSlots, selectedOwnerId],
  )

  const appointmentCalendarSlots = useMemo(() => {
    return appointments.map((appointment, index) => {
      const [dayName, datePart] = appointment.dateLabel.split(',')
      const [startTime, endTime] = appointment.timeRange.split(' - ')
      return {
        id: `appt-cal-${appointment.id}`,
        bookingId: appointment.id,
        title: appointment.title,
        day: dayName,
        time: startTime,
        endTime,
        dateLabel: appointment.dateLabel,
        visibility: 'Public',
        bookingStatus: 'Booked',
        bookedBy: userName,
        bookedEmail: null,
        category: 'booked',
        recurringLabel: appointment.recurringLabel,
        inviteLink: `https://mcbook.app/appointment/${appointment.id}`,
        ownerName: appointment.ownerName,
        ownerEmail: appointment.ownerEmail,
        rowSpan: 1,
        sortOrder: index,
        datePart: datePart?.trim() || '',
      }
    })
  }, [appointments, userName])

  const selectedCalendarAppointment = useMemo(
    () => appointmentCalendarSlots.find((slot) => slot.id === selectedCalendarAppointmentId) || null,
    [appointmentCalendarSlots, selectedCalendarAppointmentId],
  )

  return (
    <div className="app">
      <Navbar variant="user" />
      <main className="app-main user-dashboard">
        <div className="user-dashboard__layout">
          <DashboardSidebar
            sections={userSidebarSections}
            activeSection={activeSection}
            onSelect={handleSidebarSelect}
            ariaLabel="Student dashboard sections"
          />

          <section className="user-dashboard__main">
            <header className="user-dashboard__header">
              <h1>Hi, {userName}</h1>
              <p>Manage your appointments, booking requests, and schedule.</p>
              <p className="user-dashboard__helper">Browse active office hours and reserve available slots.</p>
            </header>

            {activeSection === 'overview' ? (
              <div className="user-dashboard__workspace">
                <WeeklyCalendar
                  days={weekDays}
                  timeRows={timeRows}
                  slots={appointmentCalendarSlots}
                  selectedSlotId={selectedCalendarAppointmentId}
                  onSelectSlot={(slot) => {
                    setSelectedCalendarAppointmentId(slot.id)
                    setSelectedFreeSlotCell(null)
                  }}
                  onSelectEmptyCell={(cell) => {
                    setSelectedFreeSlotCell(cell)
                    setSelectedCalendarAppointmentId(null)
                  }}
                />

                <div className="user-dashboard__right-stack">
                  <section className="user-side-panel user-side-panel--appointments">
                    {!selectedFreeSlotCell ? <h2>Upcoming Meetings</h2> : null}
                    {selectedFreeSlotCell ? (
                      <div className="user-side-panel__request-form-wrap">
                        <RequestMeetingForm
                          owners={owners}
                          onSubmit={handleSubmitRequest}
                          title={`Request for ${selectedFreeSlotCell.day} at ${selectedFreeSlotCell.time}`}
                          initialPreferredTime={`${selectedFreeSlotCell.day} at ${selectedFreeSlotCell.time}`}
                          onCancel={() => setSelectedFreeSlotCell(null)}
                        />
                      </div>
                    ) : selectedCalendarAppointment ? (
                      <div className="user-side-panel__details">
                        <p>
                          <strong>Title:</strong> {selectedCalendarAppointment.title}
                        </p>
                        <p>
                          <strong>Owner:</strong> {selectedCalendarAppointment.ownerName}
                        </p>
                        <p>
                          <strong>Date:</strong> {selectedCalendarAppointment.dateLabel}
                        </p>
                        <p>
                          <strong>Time:</strong> {selectedCalendarAppointment.time} - {selectedCalendarAppointment.endTime}
                        </p>
                        <div className="user-side-panel__actions">
                          <a href={`mailto:${selectedCalendarAppointment.ownerEmail}`}>Message Owner</a>
                          <button
                            type="button"
                            onClick={() => {
                              const a = appointments.find(
                                (x) => x.id === String(selectedCalendarAppointment.bookingId),
                              )
                              if (a) requestCancel(a)
                            }}
                          >
                            Cancel Booking
                          </button>
                        </div>
                        <button type="button" className="user-side-panel__clear" onClick={() => setSelectedCalendarAppointmentId(null)}>
                          Clear Selection
                        </button>
                      </div>
                    ) : (
                      <div className="user-side-panel__list">
                        {appointments.slice(0, 3).map((appointment) => (
                          <button
                            key={appointment.id}
                            type="button"
                            className="user-side-panel__meeting"
                            onClick={() => setSelectedCalendarAppointmentId(`appt-cal-${appointment.id}`)}
                          >
                            <strong>{appointment.title}</strong>
                            <span>{appointment.dateLabel}</span>
                            <span>{appointment.timeRange}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="user-side-panel">
                    <h2>Recent Requests</h2>
                    <div className="user-side-panel__request-list">
                      {requests.slice(0, 2).map((request) => (
                        <UserRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {activeSection === 'browse-slots' ? (
              <div className="user-dashboard__workspace">
                <div className="user-dashboard__left-stack">
                  {browseSlotsError ? (
                    <p className="user-panel__empty">{browseSlotsError}</p>
                  ) : browseSlotsLoading ? (
                    <p className="user-panel__empty">Loading available slots…</p>
                  ) : (
                    <>
                      <OwnerList
                        owners={browseOwners}
                        selectedOwnerId={selectedOwnerId}
                        onSelectOwner={setSelectedOwnerId}
                      />
                      <section className="user-panel">
                        <h2>Browse Available Slots</h2>
                        <div className="user-card-list">
                          {browseOwners.length === 0 ? (
                            <p className="user-panel__empty">
                              No active public slots were returned from the server. From the project server folder, run
                              &quot;npm run seed:demo-slots&quot; to insert demo data, then sign in with a
                              @mail.mcgill.ca test account to browse and book.
                            </p>
                          ) : visibleOwnerSlots.length === 0 ? (
                            <p className="user-panel__empty">No slots listed for this instructor (try another one).</p>
                          ) : (
                            visibleOwnerSlots.map((slot) => (
                              <AvailableSlotCard key={slot.id} slot={slot} onBook={handleBookSlot} />
                            ))
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </div>

                <aside className="user-side-panel">
                  <h2>Quick Actions</h2>
                  <p>Select an owner and reserve an available slot.</p>
                  <button type="button" onClick={() => setActiveSection('my-appointments')}>
                    View My Appointments
                  </button>
                  <button type="button" onClick={() => setActiveSection('requests')}>
                    Request a Meeting
                  </button>
                </aside>
              </div>
            ) : null}

            {activeSection === 'my-appointments' ? (
              <section className="user-panel">
                <h2>My Appointments</h2>
                <div className="user-card-list">
                  {appointments.length === 0 ? (
                    <p className="user-panel__empty">No appointments booked yet.</p>
                  ) : (
                    appointments.map((appointment) => (
                      <AppointmentCard key={appointment.id} appointment={appointment} onCancel={requestCancel} />
                    ))
                  )}
                </div>
              </section>
            ) : null}

{showInviteModal && (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%' }}>
      <h2>Available Slots</h2>
      {inviteSlots.length === 0 ? (
        <p>No active slots available.</p>
      ) : (
        inviteSlots.map(slot => (
          <div key={slot.id} style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
            <h3>{slot.title}</h3>
            <p>
            {new Date((slot.slot_date).split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} - {slot.start_time} to {slot.end_time}
            </p>

            <button type="button" 
              onClick={() => alert(`Slot "${slot.title}" reserved!`)}
              style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Reserve Slot
            </button>
          </div>
        ))
      )}
      <button onClick={() => setShowInviteModal(false)}>Close</button>
    </div>
  </div>
)}

            {activeSection === 'requests' ? (
              <div className="user-dashboard__workspace">
                <section className="user-panel">
                  <RequestMeetingForm owners={owners} onSubmit={handleSubmitRequest} />
                  <h2>My Requests</h2>
                  <div className="user-card-list">
                    {requests.map((request) => (
                      <UserRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                </section>
                <aside className="user-side-panel">
                  <h2>Request Notes</h2>
                  <p>Pending requests remain visible until an owner accepts or declines.</p>
                  <p>Accepted requests should be treated as upcoming appointments.</p>
                </aside>
              </div>
            ) : null}

            {activeSection === 'export' ? (
              <section className="user-panel">
                <h2>Export to Calendar</h2>
                <ExportPanel showHeading={false} />
              </section>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />
      {cancelTarget ? (
        <CancelBookingCard
          appointment={cancelTarget}
          isLoading={cancelLoading}
          onClose={() => {
            if (!cancelLoading) setCancelTarget(null)
          }}
          onConfirm={confirmCancelBooking}
        />
      ) : null}
    </div>
  )
}
