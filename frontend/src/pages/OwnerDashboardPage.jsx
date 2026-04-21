// code written by Rupneet (ID: 261096653)

import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'
import SummaryCards from '../components/SummaryCards'
import SlotCard from '../components/SlotCard'
import RequestCard from '../components/RequestCard'
import RecurringCard from '../components/RecurringCard'
import GroupMeetingCard from '../components/GroupMeetingCard'
import ExportPanel from '../components/ExportPanel'
import QuickActions from '../components/QuickActions'
import CreateSlotForm from '../components/CreateSlotForm'
import {
  sidebarSections,
  summaryCards,
  slots,
  meetingRequests,
  groupMeetings,
  recurringHours,
} from '../data/ownerDashboardData'
import '../styles/OwnerDashboardPage.css'

export default function OwnerDashboardPage() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="app">
      <Navbar variant="owner" />
      <main className="app-main owner-dashboard">
        <div className="owner-dashboard__layout">
          <DashboardSidebar sections={sidebarSections} activeSection={activeSection} onSelect={setActiveSection} />

          <section className="owner-dashboard__main">
            <header className="owner-dashboard__header">
              <h1>Owner Dashboard</h1>
              <p>Manage booking slots, requests, and office hours.</p>
              <p className="owner-dashboard__helper">All newly created slots remain private until activated.</p>
            </header>

            <SummaryCards cards={summaryCards} />

            {activeSection === 'overview' ? (
              <div className="owner-section owner-section--grid">
                <div className="owner-panel">
                  <h2>My Slots</h2>
                  <div className="owner-card-list">{slots.slice(0, 2).map((slot) => <SlotCard key={slot.id} slot={slot} />)}</div>
                </div>
                <div className="owner-panel">
                  <h2>Meeting Requests</h2>
                  <div className="owner-card-list">{meetingRequests.map((request) => <RequestCard key={request.id} request={request} />)}</div>
                </div>
                <QuickActions onJump={setActiveSection} />
                <ExportPanel />
              </div>
            ) : null}

            {activeSection === 'my-slots' ? (
              <section className="owner-section">
                <h2>My Slots</h2>
                <div className="owner-card-list">{slots.map((slot) => <SlotCard key={slot.id} slot={slot} />)}</div>
              </section>
            ) : null}

            {activeSection === 'create-slot' ? (
              <section className="owner-section">
                <CreateSlotForm />
              </section>
            ) : null}

            {activeSection === 'meeting-requests' ? (
              <section className="owner-section">
                <h2>Meeting Requests</h2>
                <div className="owner-card-list">{meetingRequests.map((request) => <RequestCard key={request.id} request={request} />)}</div>
              </section>
            ) : null}

            {activeSection === 'group-scheduling' ? (
              <section className="owner-section">
                <h2>Group Scheduling</h2>
                <div className="owner-card-list">{groupMeetings.map((meeting) => <GroupMeetingCard key={meeting.id} meeting={meeting} />)}</div>
              </section>
            ) : null}

            {activeSection === 'recurring-hours' ? (
              <section className="owner-section">
                <h2>Recurring Office Hours</h2>
                <div className="owner-card-list">{recurringHours.map((item) => <RecurringCard key={item.id} item={item} />)}</div>
              </section>
            ) : null}

            {activeSection === 'export-calendar' ? (
              <section className="owner-section">
                <ExportPanel />
              </section>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
