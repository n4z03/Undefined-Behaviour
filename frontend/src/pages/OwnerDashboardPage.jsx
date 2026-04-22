// code written by Rupneet (ID: 261096653)

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  meetingRequests,
} from '../data/ownerDashboardData'
import { getNextDateForWeekday, mapBackendSlotsToCalendarSlots } from '../utils/ownerSlotAdapters'

function firstNameOrAdmin(fullName) {
  const part = String(fullName || '').trim().split(/\s+/)[0]
  return part || 'Admin'
}
import '../styles/OwnerDashboardPage.css'

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

  async function fetchOwnerSlots() {
    setLoadingSlots(true)
    setLoadError('')
    try {
      const response = await fetch('http://localhost:3000/api/ownerSlots', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Could not load slots. Please check your login session.')
        }
        throw new Error('Could not load slots. Please check backend access and allowed frontend port.')
      }

      const data = await response.json()
      setSlots(mapBackendSlotsToCalendarSlots(data.slots || []))
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
        const response = await fetch('http://localhost:3000/api/auth/me', {
          credentials: 'include',
        })

        if (!response.ok) return
        const data = await response.json()
        const nextName = firstNameOrAdmin(data?.user?.name)
        setOwnerName(nextName)
      } catch {
        setOwnerName('Admin')
      }
    }

    fetchOwnerName()
  }, [])

  function handleSidebarSelect(sectionId) {
    if (sectionId === 'logout') {
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
                    />
                    {activeSection === 'overview' ? (
                      <RecentRequestsPreview requests={meetingRequests.slice(0, 2)} onViewAll={() => handleSidebarSelect('requests')} />
                    ) : null}
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
                          <article
                            key={slot.id}
                            className={`owner-slot-list__item ${
                              slot.visibility === 'Private' ? 'owner-slot-list__item--private' : 'owner-slot-list__item--public'
                            }`}
                          >
                            <div className="owner-slot-list__top">
                              <h3>{slot.title}</h3>
                              <span className="owner-slot-list__status">{slot.visibility}</span>
                            </div>
                            <p className="owner-slot-list__meta">{slot.dateLabel}</p>
                            <p className="owner-slot-list__meta">
                              {slot.time} - {slot.endTime}
                            </p>
                          </article>
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
                    />
                  </div>
                </div>
              </>
            ) : null}

            {activeSection === 'requests' ? (
              <section className="owner-section">
                <h2>Meeting Requests</h2>
                <div className="owner-request-list">
                  {meetingRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              </section>
            ) : null}

            {activeSection === 'export' ? (
              <section className="owner-section">
                <h2>Export to Calendar</h2>
                <ExportPanel showHeading={false} />
              </section>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
