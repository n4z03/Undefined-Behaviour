// Code written by Rupneet (ID: 261096653)
// code added by Sophia Casalme (261149930), Nazifa Ahmed (261112966)
// Bonita Baladi (261097353) - wired meetingRequestsData to /api/meetingRequests/incoming,removed hardcoded meetingRequests import, fixed RecentRequestsPreview and RequestCard renders

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'
import WeeklyCalendar from '../components/WeeklyCalendar'
import OwnerActionPanel from '../components/OwnerActionPanel'
import RequestCard from '../components/RequestCard'
import ExportPanel from '../components/ExportPanel'
import RecentRequestsPreview from '../components/RecentRequestsPreview'
import OwnerUpcomingMeetingsPreview from '../components/OwnerUpcomingMeetingsPreview'
import {
  addDaysToYmd,
  buildWeekColumnsFromMonday,
  filterSlotsByWeek,
  formatWeekRangeLabel,
  getMondayOfWeekContaining,
  mapBackendSlotToCalendarSlot,
  mapBackendSlotsToCalendarSlots,
  ownerCalendarEndTimeLabel,
  ownerCalendarTimeRowLabels,
} from '../utils/ownerSlotAdapters'
import GroupMeetingForm from '../components/GroupMeetingForm'
import GroupMeetingManager from '../components/GroupMeetingManager'
import '../styles/OwnerDashboardPage.css'
import AppointmentCard from '../components/AppointmentCard'
import CancelBookingCard from '../components/CancelBookingCard'
import OwnerList from '../components/OwnerList'
import AvailableSlotCard from '../components/AvailableSlotCard'
import { useNavigate, useSearchParams } from 'react-router-dom'

const sidebarSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'calendar', label: 'Upcoming Meetings' },
  { id: 'browse-slots', label: 'Browse Slots' },
  { id: 'group-meeting', label: 'Group Meeting' },
  { id: 'requests', label: 'Requests' },
  { id: 'export', label: 'Export to Calendar' },
]

const ownerCalendarTimeRows = ownerCalendarTimeRowLabels()
const ownerCalendarTimeEnd = ownerCalendarEndTimeLabel()

function firstNameOrAdmin(fullName) {
  const part = String(fullName || '').trim().split(/\s+/)[0]
  if (!part) return 'Admin'
  return part.charAt(0).toUpperCase() + part.slice(1)
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
  const [ownerId, setOwnerId] = useState(null)
  const [searchParams] = useSearchParams()
  const [upcomingFilter, setUpcomingFilter] = useState('all') // 'all' | 'students' | 'professors'
  const [slotParticipants, setSlotParticipants] = useState([]) // confirmed bookings on owner's slots
  const [participantsLoading, setParticipantsLoading] = useState(false)

  // browse slots
  const [browseOwners, setBrowseOwners] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedBrowseOwnerId, setSelectedBrowseOwnerId] = useState('')
  const [browseSlotsLoading, setBrowseSlotsLoading] = useState(false)
  const [browseSlotsError, setBrowseSlotsError] = useState(null)

  // meetings the owner has joined as a participant
  const [bookedSlots, setBookedSlots] = useState([])
  const [bookedSlotsLoading, setBookedSlotsLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  /** Monday YYYY-MM-DD of the visible week on the owner overview calendar */
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeekContaining())

  const weekColumns = useMemo(() => buildWeekColumnsFromMonday(weekMonday), [weekMonday])
  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekMonday), [weekMonday])
  const allCalendarSlots = useMemo(() => {
    const joinedSlots = mapBackendSlotsToCalendarSlots(bookedSlots).map((slot) => ({
      ...slot,
      id: `joined-${slot.backendId || slot.id}`,
      originalSlotId: slot.backendId || slot.id,
      bookingId: slot.booking_id,
      title: `Joined: ${slot.title}`,
      visibility: 'Joined',
      bookingStatus: 'Joined',
      isJoinedSlot: true,
    }))
    return [...slots, ...joinedSlots]
  }, [slots, bookedSlots])
  const calendarSlotsForWeek = useMemo(() => filterSlotsByWeek(allCalendarSlots, weekMonday), [allCalendarSlots, weekMonday])
  const upcomingMeetings = useMemo(() => {
    const now = Date.now()
    return slots
      .map((slot) => {
        const dt = new Date(`${slot.fullDate}T${slot.timeInputStart || '00:00'}:00`)
        return { ...slot, startsAtMs: dt.getTime() }
      })
      .filter((slot) => Number.isFinite(slot.startsAtMs) && slot.startsAtMs >= now)
      .sort((a, b) => a.startsAtMs - b.startsAtMs)
      .slice(0, 3)
  }, [slots])

  // added by Bonita - fetch real requests from backend instead of hardcoded data
  const [meetingRequestsData, setMeetingRequestsData] = useState([])

  function mapOwnerBookedSlotToAppointment(row) {
    const slotDate = String(row.slot_date || '').split('T')[0]
  
    return {
      id: String(row.booking_id),
      slotId: String(row.id),
      exportId: String(row.id),
      ownerId: String(row.owner_id),
      ownerName: row.host_name,
      ownerEmail: row.host_email,
      title: row.title,
      dateLabel: new Date(`${slotDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      timeRange: `${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`,
      slotDate,
      status: 'Confirmed',
      recurringLabel: Number(row.is_recurring) === 1 ? 'Recurring' : null,
    }
  }

  function mapOverviewSlotToUpcomingItem(slot, inferredRole = null) {
    return {
      id: String(slot.id),
      slotId: String(slot.backendId || slot.id),
      exportId: String(slot.backendId || slot.id),
      ownerId: String(ownerId || ''),
      ownerName: slot.bookedBy || 'Booked meeting',
      ownerEmail: slot.bookedEmail || '',
      title: slot.title,
      dateLabel: slot.dateLabel,
      timeRange: `${slot.time} - ${slot.endTime}`,
      slotDate: slot.fullDate || slot.dateInput || '',
      status: slot.bookingStatus === 'Joined' ? 'Joined' : 'Confirmed',
      recurringLabel: slot.recurringLabel || null,
      direction: slot.isJoinedSlot ? 'outgoing' : 'incoming',
      role: slot.isJoinedSlot ? 'owner' : inferredRole || 'user',
    }
  }

  function mapOwnerAvailableSlotToBrowse(row) {
    return {
      id: String(row.id),
      ownerId: String(row.owner_id),
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      title: row.title,
      dateLabel: new Date(`${String(row.slot_date).split('T')[0]}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      timeRange: `${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`,
      status: 'Available',
      visibility: 'Public',
      recurringLabel: Number(row.is_recurring) === 1 ? 'Recurring' : null,
    }
  }

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
  // added by Bonita — poll every 30 seconds so new requests appear without page refresh
  const interval = setInterval(fetchRequests, 30000)
  return () => clearInterval(interval)
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
    loadBookedSlots()
  }, [])

  useEffect(() => {
    async function fetchOwnerName() {
      try {
        const response = await apiFetch('/api/auth/me', {
          credentials: 'include',
        })

        if (!response.ok) return
        const data = await response.json()
        setOwnerId(data?.user?.id)
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

  useEffect(() => {
    const ownerParam = searchParams.get('owner')
    if (!ownerParam) return
    setSelectedBrowseOwnerId(ownerParam)
    setActiveSection('browse-slots')
    loadAvailableSlots()
  }, [])

  async function loadAvailableSlots() {
    setBrowseSlotsLoading(true)
    setBrowseSlotsError(null)
    try {
      const res = await apiFetch('/api/bookings/available-slots', { credentials: 'include' })
      if (!res.ok) { setBrowseSlotsError('Could not load available slots.'); return }
      const data = await res.json()
      const rows = data.slots || []
      setAvailableSlots(rows.map(mapOwnerAvailableSlotToBrowse))
      // Build unique owner list from slots
      const ownerMap = new Map()
      for (const row of rows) {
        if (!ownerMap.has(String(row.owner_id))) {
          ownerMap.set(String(row.owner_id), { id: String(row.owner_id), name: row.owner_name, email: row.owner_email })
        }
      }
      const owners = Array.from(ownerMap.values())
      setBrowseOwners(owners)
      const ownerParam = searchParams.get('owner')
      if (owners.length > 0 && !ownerParam) {
        setSelectedBrowseOwnerId(owners[0].id)
      }
    } catch (e) {
      setBrowseSlotsError('Could not load available slots.')
    } finally {
      setBrowseSlotsLoading(false)
    }
  }
  
  async function loadBookedSlots() {
    setBookedSlotsLoading(true)
    try {
      const res = await apiFetch('/api/ownerSlots/dashboard', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setBookedSlots(data.booked_slots || [])
    } catch (e) {
      console.error('Could not load booked slots:', e)
    } finally {
      setBookedSlotsLoading(false)
    }
  }

  async function loadSlotParticipants() {
    setParticipantsLoading(true)
    try {
      const res = await apiFetch('/api/ownerSlots', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      // For each slot that has bookings, fetch participants
      const slotsWithBookings = (data.slots || []).filter(s => s.current_bookings > 0)
      const all = []
      await Promise.all(slotsWithBookings.map(async (slot) => {
        const r = await apiFetch(`/api/ownerSlots/${slot.id}/participants`, { credentials: 'include' })
        if (!r.ok) return
        const d = await r.json()
        for (const p of (d.participants || [])) {
          if (p.booking_status !== 'confirmed') continue
          all.push({
            id: String(p.booking_id),
            slotId: String(slot.id),
            exportId: String(slot.id),
            title: slot.title,
            ownerName: p.name,
            ownerEmail: p.email,
            dateLabel: new Date(`${String(slot.slot_date).split('T')[0]}T12:00:00`).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            }),
            timeRange: `${slot.start_time?.slice(0, 5)} - ${slot.end_time?.slice(0, 5)}`,
            slotDate: String(slot.slot_date).split('T')[0],
            status: 'Confirmed',
            role: p.role || 'user',   // 'owner' or 'user'
            recurringLabel: Number(slot.is_recurring) === 1 ? 'Recurring' : null,
          })
        }
      }))
      setSlotParticipants(all)
    } catch (e) {
      console.error('Could not load participants:', e)
    } finally {
      setParticipantsLoading(false)
    }
  }

  async function refreshOwnerMeetingViews() {
    await Promise.all([fetchOwnerSlots(), loadBookedSlots(), loadSlotParticipants()])
  }

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

    if (sectionId === 'browse-slots') loadAvailableSlots()
    if (sectionId === 'overview') {
      refreshOwnerMeetingViews()
    }
    if (sectionId === 'calendar') {
      refreshOwnerMeetingViews()
    }
  }

  async function confirmCancelJoinedBooking() {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      const res = await apiFetch(`/api/ownerSlots/${cancelTarget.slotId}/book`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data.error || 'Could not cancel booking.')
        return
      }
      if (data.host && data.cancelledSlot) {
        const subj = encodeURIComponent(`Cancellation: ${data.cancelledSlot.title}`)
        const body = encodeURIComponent(
        `Hi ${data.host.name},\n\nI need to cancel my booking for "${data.cancelledSlot.title}" on ${data.cancelledSlot.slot_date} (${data.cancelledSlot.start_time} – ${data.cancelledSlot.end_time}).\n\nApologies for the inconvenience.`
        )
        window.open(`mailto:${data.host.email}?subject=${subj}&body=${body}`, '_blank', 'noopener,noreferrer')
      }
      setCancelTarget(null)
      await loadBookedSlots()
      await loadSlotParticipants()
      await fetchOwnerSlots()
      setActionMessage('Booking cancelled.')
      setTimeout(() => setActionMessage(''), 3000)
    } catch (e) {
      window.alert('Could not cancel booking.')
    } finally {
      setCancelLoading(false)
    }
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

  function handlePrevWeek() {
    setWeekMonday((m) => addDaysToYmd(m, -7))
  }

  function handleNextWeek() {
    setWeekMonday((m) => addDaysToYmd(m, 7))
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

  return (
    <div className="app">
      <Navbar variant="owner" />
      <main className="app-main owner-dashboard">
        <div className="owner-dashboard__layout">
          <DashboardSidebar sections={sidebarSections} activeSection={activeSection} onSelect={handleSidebarSelect} />

          <section className="owner-dashboard__main">
            <header className="owner-dashboard__header">
              <h1>Hi, {ownerName} 👋</h1>
              <p>Manage office hours, booking slots, and meeting requests.</p>
              <p className="owner-dashboard__helper">New slots remain private until activated.</p>
              <p className="owner-dashboard__timezone"><em>All timings are in EST.</em></p>
              {loadingSlots ? <p className="owner-dashboard__notice">Loading slots...</p> : null}
              {loadError ? <p className="owner-dashboard__notice owner-dashboard__notice--error">{loadError}</p> : null}
              {actionMessage ? <p className="owner-dashboard__notice owner-dashboard__notice--success">{actionMessage}</p> : null}
            </header>

            {activeSection === 'overview' ? (
              <>
                <div className="owner-dashboard__week-toolbar" role="group" aria-label="Week navigation">
                  <div className="owner-dashboard__week-calendar-controls">
                    <button type="button" className="owner-dashboard__week-nav-btn" onClick={handlePrevWeek}>
                      Previous Week
                    </button>
                    <span className="owner-dashboard__week-range" aria-live="polite">
                      {weekRangeLabel}
                    </span>
                    <button type="button" className="owner-dashboard__week-nav-btn" onClick={handleNextWeek}>
                      Next Week
                    </button>
                  </div>
                  {/* Share availabilities button by Sophia */}
                  <button type="button" className="owner-dashboard__week-nav-btn" 
                  style={{backgroundColor: '#c40000', color: 'white'}}
                  onClick={() => {
                    // Use hash route so shared links still work on static hosts without SPA rewrite rules.
                    const url = `${window.location.origin}/#/user-dashboard?owner=${ownerId}`
                    navigator.clipboard.writeText(url)
                    setActionMessage('Availabilities link copied to clipboard!')
                    setTimeout(() => setActionMessage(''), 3000)
                  }}>Share All Availabilities</button>
                </div>
                <div className="owner-dashboard__workspace owner-dashboard__workspace--overview">
                  <WeeklyCalendar
                    weekColumns={weekColumns}
                    timeRows={ownerCalendarTimeRows}
                    timeEndLabel={ownerCalendarTimeEnd}
                    slots={calendarSlotsForWeek}
                    selectedSlotId={selectedSlot ? selectedSlot.id : null}
                    selectedEmptyCell={selectedCell}
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
                    <OwnerUpcomingMeetingsPreview
                      meetings={upcomingMeetings}
                      onViewAll={() => handleSidebarSelect('calendar')}
                      onSelectMeeting={(slot) => {
                        setActiveSection('calendar')
                        handleSlotSelect(slot)
                      }}
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

            {/* Added by Sophia */}
            {activeSection === 'calendar' ? (
              <section className="owner-section">
                <h2>Upcoming Meetings</h2>
                <p className="owner-section__subtitle">All confirmed bookings, both students and professors.</p>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 0 1rem' }}>
                  {['all', 'students', 'professors'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setUpcomingFilter(f)}
                      style={{
                        padding: '0.35rem 0.9rem',
                        borderRadius: '20px',
                        border: '1px solid #ccc',
                        background: upcomingFilter === f ? '#c40000' : '#f5f5f5',
                        color: upcomingFilter === f ? 'white' : '#333',
                        cursor: 'pointer',
                        fontWeight: upcomingFilter === f ? 600 : 400,
                        fontSize: '0.85rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {f === 'all' ? 'All' : f === 'students' ? 'Students' : 'Professors'}
                    </button>
                  ))}
                </div>

                {participantsLoading || bookedSlotsLoading ? (
                  <p className="owner-slot-list__empty">Loading…</p>
                ) : (() => {
                  // Bookings on the owner's own slots (students + profs who booked them)
                  const incoming = slotParticipants.map(p => ({ ...p, direction: 'incoming' }))
                  // Slots the owner joined as a participant
                  const outgoing = bookedSlots.map(slot => ({
                    ...mapOwnerBookedSlotToAppointment(slot),
                      direction: 'outgoing',
                      role: slot.booker_role || 'owner', // they booked another owner's slot
                  }))
                  // Infer role by slot from participant records so filters stay accurate.
                  const roleBySlotId = new Map()
                  for (const p of incoming) {
                    const sid = String(p.slotId || '')
                    if (!sid) continue
                    const set = roleBySlotId.get(sid) || new Set()
                    set.add(p.role || 'user')
                    roleBySlotId.set(sid, set)
                  }
                  for (const o of outgoing) {
                    const sid = String(o.slotId || '')
                    if (!sid) continue
                    const set = roleBySlotId.get(sid) || new Set()
                    set.add(o.role || 'owner')
                    roleBySlotId.set(sid, set)
                  }

                  // Ensure everything visible in Overview upcoming panel also appears here.
                  const fromOverviewPreview = upcomingMeetings.map((slot) => {
                    const sid = String(slot.backendId || slot.id || '')
                    const roleSet = roleBySlotId.get(sid)
                    const inferredRole = roleSet && roleSet.size === 1 ? Array.from(roleSet)[0] : null
                    return mapOverviewSlotToUpcomingItem(slot, inferredRole)
                  })

                  // Merge and sort by date ascending
                  const allMerged = [...incoming, ...outgoing, ...fromOverviewPreview]
                  const seen = new Set()
                  const all = allMerged
                    .filter((item) => {
                      // Keep one entry per slot+direction+role so mixed-role slots
                      // appear in the right filter buckets.
                      const key = `${item.slotId || ''}|${item.slotDate || ''}|${item.timeRange || ''}|${item.direction || ''}|${item.role || ''}`
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    })
                    .sort((a, b) => {
                    if (a.slotDate < b.slotDate) return -1
                    if (a.slotDate > b.slotDate) return 1
                    return (a.timeRange || '').localeCompare(b.timeRange || '')
                  })

                  // Apply filter
                  const filtered = all.filter(item => {
                    if (upcomingFilter === 'all') return true
                    if (upcomingFilter === 'students') return item.role === 'user'
                    if (upcomingFilter === 'professors') return item.role === 'owner'
                    return true
                  })

                  if (filtered.length === 0) {
                    return <p className="owner-slot-list__empty">No confirmed meetings found.</p>
                  }

                  return (
                      <div className="user-card-list">
                        {filtered.map(item => (
                          <div key={`${item.direction}-${item.id}`}>
                            {/* Small label showing direction */}
                            {upcomingFilter === 'all' ? (
                              <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.25rem' }}>
                                {item.direction === 'incoming'
                                  ? `Booked by ${item.role === 'owner' ? 'professor' : 'student'}`
                                  : 'You joined'}
                              </p>
                            ) : null}
                            <AppointmentCard
                              appointment={item}
                              onCancel={item.direction === 'outgoing' ? setCancelTarget : undefined}
                              onReschedule={undefined}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </section>
              ) : null}

            {/* Code added by Sophia */}
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
                        selectedOwnerId={selectedBrowseOwnerId}
                        onSelectOwner={setSelectedBrowseOwnerId}
                      />
                      <section className="user-panel">
                        <h2>Browse Available Slots</h2>
                        <div className="user-card-list">
                          {browseOwners.length === 0 ? (
                            <p className="user-panel__empty">No available slots from other professors right now.</p>
                          ) : availableSlots.filter((slot) => String(slot.ownerId) === String(selectedBrowseOwnerId)).length === 0? (
                            <p className="user-panel__empty">No slots listed for this professor.</p>
                          ) : (
                            availableSlots
                              .filter((slot) => String(slot.ownerId) === String(selectedBrowseOwnerId))
                              .map((slot) => (
                                <AvailableSlotCard
                                  key={slot.id}
                                  slot={slot}
                                  onBook={async (slotId) => {
                                  try {
                                    const res = await apiFetch(`/api/ownerSlots/${slotId}/book`, {
                                      method: 'POST',
                                      credentials: 'include',
                                    })
                                    const data = await res.json().catch(() => ({}))
                                    if (!res.ok) {
                                      window.alert(data.error || 'Could not book slot.')
                                      return
                                    }
                                    if (data.notify) {
                                      window.open(
                                        `mailto:${data.notify.to}?subject=${encodeURIComponent(data.notify.subject)}&body=${encodeURIComponent(data.notify.body)}`,
                                        '_blank',
                                        'noopener,noreferrer'
                                      )
                                    }
                                    setActionMessage('Slot booked successfully!')
                                    setTimeout(() => setActionMessage(''), 3000)
                                    await loadAvailableSlots()
                                    await loadBookedSlots()
                                    await fetchOwnerSlots()
                                  } catch (e) {
                                    window.alert('Could not book slot.')
                                  }
                                }}
                              />
                            ))
                        )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      ) : null}
 
            {/* Code added by Nazifa */}
            {activeSection === 'group-meeting' ? (
              <div className="owner-dashboard__workspace" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <GroupMeetingForm onCreated={() => setGroupRefreshKey((k) => k + 1)} />
                <GroupMeetingManager
                  refreshKey={groupRefreshKey}
                  onConfirmed={async () => {
                    await refreshOwnerMeetingViews()
                  }}
                />
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

      {cancelTarget ? (
  <CancelBookingCard
    appointment={cancelTarget}
    isLoading={cancelLoading}
    onClose={() => {
      if (!cancelLoading) setCancelTarget(null)
    }}
    onConfirm={confirmCancelJoinedBooking}
  />
) : null}

    </div>
  )
}


