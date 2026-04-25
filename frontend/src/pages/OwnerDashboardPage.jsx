// Code written by Rupneet (ID: 261096653)
// code added by Sophia Casalme (261149930), Nazifa Ahmed (261112966)
// Bonita Baladi (261097353) - wired meetingRequestsData to /api/meetingRequests/incoming,removed hardcoded meetingRequests import, fixed RecentRequestsPreview and RequestCard renders

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'
import WeeklyCalendar from '../components/WeeklyCalendar'
import OwnerActionPanel from '../components/OwnerActionPanel'
import RequestCard from '../components/RequestCard'
import ExportPanel from '../components/ExportPanel'
import RecentRequestsPreview from '../components/RecentRequestsPreview'
import {
  sidebarSections,
  weekDays,
  timeRows,
  // meetingRequests removed by Bonita - now fetched from backend
} from '../data/ownerDashboardData'
import {
  getNextDateForWeekday,
  mapBackendSlotToCalendarSlot,
  mapBackendSlotsToCalendarSlots,
} from '../utils/ownerSlotAdapters'
import GroupMeetingForm from '../components/GroupMeetingForm'
import GroupMeetingManager from '../components/GroupMeetingManager'
import '../styles/OwnerDashboardPage.css'

function firstNameOrAdmin(fullName) {
  const part = String(fullName || '').trim().split(/\s+/)[0]
  return part || 'Admin'
}

export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [ownerName, setOwnerName] = useState('Admin')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const [panelMode, setPanelMode] = useState('default')
  // so group meeting list reloads when i make a new one
  const [groupRefreshKey, setGroupRefreshKey] = useState(0)

  // added by Bonita - fetch real requests from backend instead of hardcoded data
  const [meetingRequestsData, setMeetingRequestsData] = useState([])

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch('/api/meetingRequests/incoming', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        setMeetingRequestsData(data.requests || [])
      } catch (e) {
        console.error('Failed to fetch meeting requests:', e)
      }
    }
    fetchRequests()
  }, [])

  // added by Bonita - accept/decline handlers wired to backend
  async function handleAccept(requestId) {
   try {
     const response = await fetch(`/api/meetingRequests/${requestId}/accept`, {
       method: 'PATCH',
       credentials: 'include'
     })
     if (!response.ok) return
     const data = await response.json().catch(() => ({}))
     setMeetingRequestsData(prev => prev.map(r =>
       r.id === requestId ? { ...r, status: 'accepted' } : r
     ))
     await fetchOwnerSlots()
     // Open mailto to notify the student
     if (data.notify) {
       const subj = encodeURIComponent(data.notify.subject)
       const body = encodeURIComponent(data.notify.body)
       window.open(`mailto:${data.notify.to}?subject=${subj}&body=${body}`, '_blank')
     }
   } catch (err) {
     console.error('Error accepting request:', err)
   }
 }

 async function handleDecline(requestId) {
  try {
    const response = await fetch(`/api/meetingRequests/${requestId}/decline`, {
      method: 'PATCH',
      credentials: 'include'
    })
    if (!response.ok) return
    const data = await response.json().catch(() => ({}))
    setMeetingRequestsData(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'declined' } : r
    ))
    // Open mailto to notify the student
    if (data.notify) {
      const subj = encodeURIComponent(data.notify.subject)
      const body = encodeURIComponent(data.notify.body)
      window.open(`mailto:${data.notify.to}?subject=${subj}&body=${body}`, '_blank')
    }
  } catch (err) {
    console.error('Error declining request:', err)
  }
}

  async function fetchOwnerSlots() {
    setLoadingSlots(true)
    setLoadError('')
    try {
      const response = await apiFetch('/api/ownerSlots', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          navigate('/auth?mode=login', { replace: true })
          return
        }
        throw new Error('Could not load slots. Please check backend access and allowed frontend port.')
      }

      const out = await response.json()
      setSlots(mapBackendSlotsToCalendarSlots(out.slots || []))
    } catch (error) {
      setLoadError(error.message || 'Could not load slots. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    fetchOwnerSlots()
  }, [])

  useEffect(() => {
    async function fetchOwnerName() {
      try {
        const response = await apiFetch('/api/auth/me', {
          credentials: 'include',
        })

        if (!response.ok) return
        const data = await response.json()
        // If somehow a user accesses here, redirect them
        if (data?.user?.role !== 'owner') {
          navigate('/user-dashboard', { replace: true })
          return
        }
        const nextName = firstNameOrAdmin(data?.user?.name)
        setOwnerName(nextName)
      } catch {
        setOwnerName('Admin')
      }
    }

    fetchOwnerName()
  }, [])

  async function handleSidebarSelect(sectionId) {
    if (sectionId === 'logout') {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      navigate('/auth?mode=login')
      return
    }
    setActiveSection(sectionId)
    setSelectedSlot(null)
    setSelectedCell(null)
    setPanelMode('default')
  }

  function handleSlotSelect(slot) {
    setSelectedSlot(slot)
    setSelectedCell(null)
    setPanelMode('slotDetails')
  }

  function handleEmptyCellSelect(cell) {
    setSelectedCell({
      ...cell,
      slotDate: getNextDateForWeekday(cell.day),
    })
    setSelectedSlot(null)
    setPanelMode('create')
  }

  function handlePanelModeChange(mode) {
    if (mode === 'default') {
      setSelectedSlot(null)
      if (!selectedCell) setPanelMode('default')
      else {
        setSelectedCell(null)
        setPanelMode('default')
      }
      return
    }
    setPanelMode(mode)
  }

  async function handleSlotCreated() {
    await fetchOwnerSlots()
    setActionMessage('Slot created successfully and synced with calendar.')
    setTimeout(() => setActionMessage(''), 3500)
  }

  async function handleSlotPatched(row) {
    if (row) setSelectedSlot(mapBackendSlotToCalendarSlot(row))
    await fetchOwnerSlots()
    setActionMessage('Date/time saved')
    setTimeout(() => setActionMessage(''), 3200)
  }

  async function handleSlotDeleted({ affectedCount, reason = 'delete' }) {
    await fetchOwnerSlots()
    if (affectedCount > 0) {
      if (reason === 'deactivate') {
        setActionMessage(
          `Slot deactivated. Student bookings were cancelled, and a draft email was opened to notify ${affectedCount} student${affectedCount === 1 ? '' : 's'}.`,
        )
      } else {
        setActionMessage(
          `Slot removed. A draft email was opened to notify ${affectedCount} student${affectedCount === 1 ? '' : 's'}.`,
        )
      }
    } else {
      setActionMessage(reason === 'deactivate' ? 'Slot deactivated.' : 'Slot removed.')
    }
    setTimeout(() => setActionMessage(''), 5000)
  }

  async function handleLogout() {
    await apiFetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
    navigate('/auth?mode=login')
  }

  return (
    <div className="app">
      <Navbar variant="owner" />
      <main className="app-main owner-dashboard">
        <div className="owner-dashboard__layout">
          <DashboardSidebar sections={sidebarSections} activeSection={activeSection} onSelect={handleSidebarSelect} />

          <section className="owner-dashboard__main">
            <header className="owner-dashboard__header">
              <h1>Hi, {ownerName}</h1>
              <p>Manage office hours, booking slots, and meeting requests.</p>
              <p className="owner-dashboard__helper">New slots remain private until activated.</p>
              {loadingSlots ? <p className="owner-dashboard__notice">Loading slots...</p> : null}
              {loadError ? <p className="owner-dashboard__notice owner-dashboard__notice--error">{loadError}</p> : null}
              {actionMessage ? <p className="owner-dashboard__notice owner-dashboard__notice--success">{actionMessage}</p> : null}
            </header>

            {activeSection === 'overview' ? (
              <>
                <div className="owner-dashboard__workspace">
                  <WeeklyCalendar
                    days={weekDays}
                    timeRows={timeRows}
                    slots={slots}
                    selectedSlotId={selectedSlot ? selectedSlot.id : null}
                    onSelectSlot={handleSlotSelect}
                    onSelectEmptyCell={handleEmptyCellSelect}
                  />
                  <div className="owner-dashboard__right-stack">
                    <OwnerActionPanel
                      panelMode={panelMode}
                      selectedSlot={selectedSlot}
                      selectedCell={selectedCell}
                      onModeChange={handlePanelModeChange}
                      onSlotCreated={handleSlotCreated}
                      onSlotPatched={handleSlotPatched}
                      onSlotDeleted={handleSlotDeleted}
                    />
                    {/* added by Bonita - show live pending requests preview */}
                    <RecentRequestsPreview
                      requests={meetingRequestsData.filter(r => r.status === 'pending').slice(0, 2)}
                      onViewAll={() => handleSidebarSelect('requests')}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {activeSection === 'calendar' ? (
              <>
                <div className="owner-dashboard__workspace">
                  <section className="owner-section">
                    <h2>All Booking Slots</h2>
                    <div className="owner-slot-list">
                      {slots.length === 0 ? (
                        <p className="owner-slot-list__empty">No slots yet. Create one from the actions panel.</p>
                      ) : (
                        slots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            className={`owner-slot-list__item ${
                              slot.visibility === 'Private' ? 'owner-slot-list__item--private' : 'owner-slot-list__item--public'
                            }`}
                            onClick={() => handleSlotSelect(slot)}
                          >
                            <div className="owner-slot-list__top">
                              <h3>{slot.title}</h3>
                              <span className="owner-slot-list__status">{slot.visibility}</span>
                            </div>
                            <p className="owner-slot-list__meta">{slot.dateLabel}</p>
                            <p className="owner-slot-list__meta">
                              {slot.time} - {slot.endTime}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                  <div className="owner-dashboard__right-stack">
                    <OwnerActionPanel
                      panelMode={panelMode}
                      selectedSlot={selectedSlot}
                      selectedCell={selectedCell}
                      onModeChange={handlePanelModeChange}
                      onSlotCreated={handleSlotCreated}
                      onSlotPatched={handleSlotPatched}
                      onSlotDeleted={handleSlotDeleted}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {/* Code added by Nazifa */}
            {activeSection === 'group-meeting' ? (
              <div className="owner-dashboard__workspace" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <GroupMeetingForm onCreated={() => setGroupRefreshKey((k) => k + 1)} />
                <GroupMeetingManager refreshKey={groupRefreshKey} />
              </div>
            ) : null}

            {activeSection === 'requests' ? (
              <section className="owner-section">
                <h2>Meeting Requests</h2>
                <p className="owner-section__subtitle">
                  Students asking you to set up a new time. If someone <strong>reserved a slot you published</strong>, that
                  shows on the calendar when you open that block — not here.
                </p>
                <div className="owner-request-list">
                  {/* added by Bonita - render real requests from backend */}
                  {meetingRequestsData.map((request) => (
                    <RequestCard key={request.id} request={request} onAccept={handleAccept} onDecline={handleDecline} />
                  ))}
                </div>
              </section>
            ) : null}

            {activeSection === 'export' ? (
              <section className="owner-section">
                <h2>Export to Calendar</h2>
                {/* Bonita added isOwner={true} */}
                <ExportPanel showHeading={false} isOwner={true} />
              </section>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
