// code written by Rupneet (ID: 261096653)

import { useState } from 'react'
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
  ownerFullName,
  weekDays,
  timeRows,
  calendarSlots,
  meetingRequests,
} from '../data/ownerDashboardData'

function ownerFirstName(fullName) {
  const part = fullName.trim().split(/\s+/)[0]
  return part || 'there'
}
import '../styles/OwnerDashboardPage.css'

export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const [panelMode, setPanelMode] = useState('default')

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
    setSelectedCell(cell)
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

  return (
    <div className="app">
      <Navbar variant="owner" />
      <main className="app-main owner-dashboard">
        <div className="owner-dashboard__layout">
          <DashboardSidebar sections={sidebarSections} activeSection={activeSection} onSelect={handleSidebarSelect} />

          <section className="owner-dashboard__main">
            <header className="owner-dashboard__header">
              <h1>Hi, {ownerFirstName(ownerFullName)}</h1>
              <p>Manage office hours, booking slots, and meeting requests.</p>
              <p className="owner-dashboard__helper">New slots remain private until activated.</p>
            </header>

            {(activeSection === 'overview' || activeSection === 'calendar') ? (
              <>
                <div className="owner-dashboard__workspace">
                  <WeeklyCalendar
                    days={weekDays}
                    timeRows={timeRows}
                    slots={calendarSlots}
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
                    />
                    {activeSection === 'overview' ? (
                      <RecentRequestsPreview requests={meetingRequests.slice(0, 2)} onViewAll={() => handleSidebarSelect('requests')} />
                    ) : null}
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
