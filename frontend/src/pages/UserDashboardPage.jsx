// Rupneet Shahriar (261096653)
//code added by Nazifa 261112966, Bonita Baladi 261097353 (added paste invite link bar and empty state to group-meetings section), Sophia Casalme 261149930 (share availabilities, invite url modal)

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
import RescheduleBookingCard from '../components/RescheduleBookingCard'
import RequestMeetingForm from '../components/RequestMeetingForm'
import UserRequestCard from '../components/UserRequestCard'
import GroupMeetingVote from '../components/GroupMeetingVote' // added by Bonita
import {
  addDaysToYmd,
  buildWeekColumnsFromMonday,
  filterSlotsByWeek,
  formatTime24To12,
  formatWeekRangeLabel,
  getMondayOfWeekContaining,
  ownerCalendarEndTimeLabel,
  ownerCalendarTimeRowLabels,
  timeForInput,
  timeToMinutesFromMidnight,
} from '../utils/ownerSlotAdapters'
import '../styles/UserDashboardPage.css'
import { useNavigate, useSearchParams } from 'react-router-dom'

const userSidebarSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'browse-slots', label: 'Browse Slots' },
  { id: 'my-appointments', label: 'My Appointments' },
  { id: 'group-meetings', label: 'Group Meetings' },
  { id: 'requests', label: 'Requests' },
  { id: 'export', label: 'Export to Calendar' },
]

const userCalendarTimeRows = ownerCalendarTimeRowLabels()
const userCalendarTimeEnd = ownerCalendarEndTimeLabel()

function firstNameFromName(name) {
  const first = String(name || '').trim().split(/\s+/)[0]
  if (!first) return 'User'
  return first.charAt(0).toUpperCase() + first.slice(1)
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
  const slotDate = String(row.slot_date || '').split('T')[0]
  const startTime24 = timeForInput(row.start_time)
  const endTime24 = timeForInput(row.end_time)
  return {
    id: String(row.booking_id),
    slotId: String(row.slot_id),
    ownerId: String(row.owner_id),
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    title: row.title,
    dateLabel: dateLabelFromDb(slotDate),
    timeRange: `${formatTime24To12(row.start_time)} - ${formatTime24To12(row.end_time)}`,
    slotDate,
    startTime24,
    endTime24,
    startMinutes: timeToMinutesFromMidnight(row.start_time),
    endMinutes: timeToMinutesFromMidnight(row.end_time),
    status: 'Confirmed',
    recurringLabel: Number(row.is_recurring) === 1 ? 'Recurring' : null,
    slotType: row.slot_type || 'office_hours',  // added by Bonita
  }
}

// Nazifa (261112966)
// /api/meetingRequests/outgoing row for pending requests
function mapOutgoingRequest(mr) {
  let proposedDate = ''
  let proposedStart = '10:00'
  let proposedEnd = '10:30'
  let lineSubject = ''
  const subj = (mr.subject || '').trim()
  const m = subj.match(/^\[(\d{4}-\d{2}-\d{2})\s+([0-9:]+)\s*-\s*([0-9:]+)\]\s*(.*)$/)
  if (m) {
    proposedDate = m[1]
    proposedStart = m[2].length >= 5 ? m[2].slice(0, 5) : m[2]
    proposedEnd = m[3].length >= 5 ? m[3].slice(0, 5) : m[3]
    lineSubject = m[4].trim()
  }
  const st = (mr.status || '').toLowerCase()
  return {
    id: String(mr.id),
    ownerName: mr.owner_name,
    ownerEmail: mr.owner_email,
    ownerId: String(mr.owner_id),
    message: mr.message,
    status: st === 'pending' ? 'Pending' : st === 'accepted' ? 'Accepted' : 'Declined',
    statusRaw: mr.status,
    createdAt: mr.created_at
      ? new Date(mr.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '',
    proposedDate: proposedDate || new Date().toISOString().slice(0, 10),
    proposedStart,
    proposedEnd,
    lineSubject,
  }
}

// finding the ids using numeric string ids - nazifa
function isServerBookingId(id) {
  if (id == null || id === '') return false
  return /^\d+$/.test(String(id).trim())
}

// added by Bonita - parse a group meeting share URL and extract the group ID.
// Handles both plain query strings (/user-dashboard?group=4)
// and HashRouter URLs (/#/user-dashboard?group=4).
function parseGroupIdFromUrl(urlStr) {
  try {
    const url = new URL(urlStr.trim())
    const hash = url.hash || ''
    if (hash.includes('?')) {
      const hashSearch = hash.slice(hash.indexOf('?'))
      const gid = new URLSearchParams(hashSearch).get('group')
      if (gid) return Number(gid)
    }
    // Fall back to normal query string
    const gid = url.searchParams.get('group')
    return gid ? Number(gid) : null
  } catch {
    return null
  }
}

export default function UserDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams() // added by Bonita (261097353)
  const [activeSection, setActiveSection] = useState('overview')
  const [userName, setUserName] = useState('User')
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [browseOwners, setBrowseOwners] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [browseSlotsLoading, setBrowseSlotsLoading] = useState(true)
  const [browseSlotsError, setBrowseSlotsError] = useState(null)
  // Nazifa Ahmed (261112966) — real bookings loaded from API; seed only used as fallback shape reference
  const [appointments, setAppointments] = useState([])
  const [requests, setRequests] = useState([])
  const [meetingOwnerOptions, setMeetingOwnerOptions] = useState([])
  const [selectedCalendarAppointmentId, setSelectedCalendarAppointmentId] = useState(null)
  const [selectedFreeSlotCell, setSelectedFreeSlotCell] = useState(null)
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeekContaining())
  // Sophia Casalme (261149930) - invite link popup
  const [inviteSlots, setInviteSlots] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  // Nazifa Ahmed (261112966)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleErr, setRescheduleErr] = useState(null)
  // added by Bonita (261097353) — derived from URL so groupId survives hard refresh; no useState needed
  const groupId = searchParams.get('group') ? Number(searchParams.get('group')) : null
  // added by Bonita - controlled input value for the paste invite link bar
  const [groupLinkInput, setGroupLinkInput] = useState('')
  // added by Bonita - error message for invalid paste link
  const [groupLinkError, setGroupLinkError] = useState('')

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

  const loadOutgoingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/meetingRequests/outgoing', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setRequests((data.requests || []).map(mapOutgoingRequest))
    } catch (e) {
      console.error('Could not load your requests', e)
    }
  }, [])

  const loadMeetingOwnerList = useCallback(async () => {
    try {
      const res = await fetch('/api/owners', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setMeetingOwnerOptions(
        (data.owners || []).map((o) => ({
          id: String(o.id),
          name: o.name,
          email: o.email,
        })),
      )
    } catch (e) {
      console.error('Could not load owners', e)
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
          const ownerParam = searchParams.get('owner')
          const redirectUrl = ownerParam
            ? `/user-dashboard?owner=${ownerParam}` : '/user-dashboard'
          navigate(`/auth?mode=login&redirect=${encodeURIComponent(redirectUrl)}`, { replace: true })
          return
        }
        if (!response.ok) {
          setBrowseSlotsLoading(false)
          return
        }
        const data = await response.json()
        const role = data?.user?.role
        if (role === 'owner') {
          const ownerParam = searchParams.get('owner')
          if (ownerParam) {
            navigate(`/owner-dashboard?owner=${ownerParam}`, { replace: true })
          } else {
            navigate('/owner-dashboard', { replace: true })
          }
          setBrowseSlotsLoading(false)
          return
        }
        if (role === 'user') {
          setUserName(firstNameFromName(data?.user?.name))
          await loadMyBookings()
          if (cancel) return
          await loadOutgoingRequests()
          if (cancel) return
          await loadMeetingOwnerList()
          if (cancel) return
          await loadAvailableSlots()
          // added by Sophia: pre-select owner in browse slots
          const ownerParam = searchParams.get('owner')
          if (ownerParam) {
            setSelectedOwnerId(ownerParam)
            setActiveSection('browse-slots')
          }
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
  }, [navigate, loadMyBookings, loadAvailableSlots, loadOutgoingRequests, loadMeetingOwnerList])

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

  // added by Bonita - read ?group= param on initial load only and switch to group-meetings section
  // added by Bonita (261097353) — intentionally uses [] not [searchParams] so this only runs once on mount;
  // running on every searchParams change would remount GroupMeetingVote and wipe its saved state

  useEffect(() => {
    const hash = window.location.hash           // e.g.  "#/user-dashboard?group=4"
    const qIdx = hash.indexOf('?')
    const gid  = qIdx >= 0
      ? new URLSearchParams(hash.slice(qIdx)).get('group')
      : null
    if (gid) {
      setActiveSection('group-meetings')
    }
  }, [])

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
      // added by Bonita - notify owner via mailto when student books a slot
      if (data.notify) {
        window.open(
          `mailto:${data.notify.to}?subject=${encodeURIComponent(data.notify.subject)}&body=${encodeURIComponent(data.notify.body)}`,
          '_blank',
          'noopener,noreferrer'
        )
      }
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

  function openReschedule(appointment) {
    if (!isServerBookingId(appointment.id)) return
    setRescheduleErr(null)
    setRescheduleTarget(appointment)
    loadAvailableSlots()
  }

  async function confirmReschedule(newSlotId) {
    if (!rescheduleTarget) return
    setRescheduleLoading(true)
    setRescheduleErr(null)
    try {
      const res = await fetch(`/api/bookings/${rescheduleTarget.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slot_id: Number(newSlotId) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRescheduleErr(
          data.error || (data.errors && data.errors[0]) || 'Could not move this booking',
        )
        return
      }
      setRescheduleTarget(null)
      await loadMyBookings()
      await loadAvailableSlots()
    } catch (e) {
      console.error(e)
      setRescheduleErr('Request failed')
    } finally {
      setRescheduleLoading(false)
    }
  }

  async function handleSubmitRequest(payload) {
    const ownerIdNum = Number(payload.ownerId)
    if (!Number.isInteger(ownerIdNum) || ownerIdNum < 1) {
      window.alert('Choose an instructor from the list (load the dashboard with the server running).')
      return
    }
    const addSecs = (t) => (t && t.length === 5 ? `${t}:00` : t)
    try {
      const res = await fetch('/api/meetingRequests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          owner_id: ownerIdNum,
          message: payload.message,
          subject: payload.subject && payload.subject.trim() ? payload.subject.trim() : null,
          proposed_date: payload.proposedDate,
          proposed_start: addSecs(payload.proposedStart),
          proposed_end: addSecs(payload.proposedEnd),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        window.alert((data.errors && data.errors[0]) || data.error || 'Could not send the request')
        return
      }
      await loadOutgoingRequests()
      // added by Bonita - notify owner via mailto when user sends a meeting request
      if (data.notify) {
        window.open(
          `mailto:${data.notify.to}?subject=${encodeURIComponent(data.notify.subject)}&body=${encodeURIComponent(data.notify.body)}`,
          '_blank',
          'noopener,noreferrer'
        )
      }
    } catch (e) {
      console.error(e)
      window.alert('Could not send the request')
    }
    setSelectedFreeSlotCell(null)
  }

  async function handleUpdateRequest(requestId, body) {
    const addSecs = (t) => (t && t.length === 5 ? `${t}:00` : t)
    try {
      const res = await fetch(`/api/meetingRequests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: body.message,
          subject: body.subject && body.subject.trim() ? body.subject.trim() : null,
          proposed_date: body.proposedDate,
          proposed_start: addSecs(body.proposedStart),
          proposed_end: addSecs(body.proposedEnd),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        window.alert((data.errors && data.errors[0]) || data.error || 'Could not update')
        return false
      }
      await loadOutgoingRequests()
      return true
    } catch (e) {
      console.error(e)
      window.alert('Could not update')
      return false
    }
  }

  // added by Bonita - handle submitting the paste invite link bar
  function handleGroupLinkSubmit() {
    setGroupLinkError('')
    const gid = parseGroupIdFromUrl(groupLinkInput)
    if (!gid) {
      setGroupLinkError('No group ID found. Make sure you paste the full invite link.')
      return
    }
    // added by Bonita (261097353) — push group ID into URL instead of local state so it survives hard refresh
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('group', gid)
      return next
    })
    setGroupLinkInput('')
  }

  const visibleOwnerSlots = useMemo(
    () => availableSlots.filter((slot) => slot.ownerId === selectedOwnerId && slot.visibility === 'Public'),
    [availableSlots, selectedOwnerId],
  )

  // only other slots for the same instructor (owner) as the booking
  const rescheduleSlotOptions = useMemo(() => {
    if (!rescheduleTarget || !rescheduleTarget.ownerId) return []
    const oid = String(rescheduleTarget.ownerId)
    return availableSlots
      .filter((s) => s.ownerId === oid)
      .map((s) => ({
        id: s.id,
        label: `${s.dateLabel} · ${s.timeRange} — ${s.title}`,
      }))
  }, [availableSlots, rescheduleTarget])

  const weekColumns = useMemo(() => buildWeekColumnsFromMonday(weekMonday), [weekMonday])
  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekMonday), [weekMonday])

  const appointmentCalendarSlots = useMemo(() => {
    return appointments.map((appointment, index) => {
      const [startTime, endTime] = appointment.timeRange.split(' - ')
      return {
        id: `appt-cal-${appointment.id}`,
        bookingId: appointment.id,
        title: appointment.title,
        day: appointment.dateLabel.split(',')[0],
        fullDate: appointment.slotDate,
        time: startTime,
        endTime,
        dateLabel: appointment.dateLabel,
        timeInputStart: appointment.startTime24,
        timeInputEnd: appointment.endTime24,
        startMinutes: appointment.startMinutes,
        endMinutes: appointment.endMinutes,
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
      }
    })
  }, [appointments, userName])

  const calendarSlotsForWeek = useMemo(
    () => filterSlotsByWeek(appointmentCalendarSlots, weekMonday),
    [appointmentCalendarSlots, weekMonday],
  )

  const selectedCalendarAppointment = useMemo(
    () => appointmentCalendarSlots.find((slot) => slot.id === selectedCalendarAppointmentId) || null,
    [appointmentCalendarSlots, selectedCalendarAppointmentId],
  )

  const appointmentForSelectedCalSlot = useMemo(() => {
    if (!selectedCalendarAppointment) return null
    return appointments.find((x) => x.id === String(selectedCalendarAppointment.bookingId)) || null
  }, [selectedCalendarAppointment, appointments])

  function handlePrevWeek() {
    setWeekMonday((m) => addDaysToYmd(m, -7))
  }

  function handleNextWeek() {
    setWeekMonday((m) => addDaysToYmd(m, 7))
  }

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
              <h1>Hi, {userName} 👋</h1>
              <p>Manage your appointments, booking requests, and schedule.</p>
              <p className="user-dashboard__helper">Browse active office hours and reserve available slots.</p>
              <p className="user-dashboard__timezone"><em>All timings are in EST.</em></p>
            </header>

            {activeSection === 'overview' ? (
              <div>
                <div className="user-dashboard__week-toolbar" role="group" aria-label="Week navigation">
                  <div className="user-dashboard__week-calendar-controls">
                    <button type="button" className="user-dashboard__week-nav-btn" onClick={handlePrevWeek}>
                      Previous Week
                    </button>
                    <span className="user-dashboard__week-range" aria-live="polite">
                      {weekRangeLabel}
                    </span>
                    <button type="button" className="user-dashboard__week-nav-btn" onClick={handleNextWeek}>
                      Next Week
                    </button>
                  </div>
                </div>

                <div className="user-dashboard__workspace">
                  <WeeklyCalendar
                    weekColumns={weekColumns}
                    timeRows={userCalendarTimeRows}
                    timeEndLabel={userCalendarTimeEnd}
                    slots={calendarSlotsForWeek}
                    selectedSlotId={selectedCalendarAppointmentId}
                    selectedEmptyCell={selectedFreeSlotCell}
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
                            owners={meetingOwnerOptions}
                            onSubmit={handleSubmitRequest}
                            title={`Request for ${selectedFreeSlotCell.day} at ${selectedFreeSlotCell.time}`}
                            initialPreferredTime={`${selectedFreeSlotCell.day} at ${selectedFreeSlotCell.time}`}
                            initialProposedDate={selectedFreeSlotCell.slotDate || selectedFreeSlotCell.fullDate || ''}
                            initialProposedStart={selectedFreeSlotCell.startTime24 || ''}
                            initialProposedEnd={selectedFreeSlotCell.endTime24 || ''}
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
                          {appointmentForSelectedCalSlot && isServerBookingId(appointmentForSelectedCalSlot.id) ? (
                            <button type="button" onClick={() => openReschedule(appointmentForSelectedCalSlot)}>
                              Change time
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (appointmentForSelectedCalSlot) requestCancel(appointmentForSelectedCalSlot)
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
                          <UserRequestCard
                            key={request.id}
                            request={request}
                            summaryOnly
                            onOpenRequests={() => setActiveSection('requests')}
                          />
                        ))}
                      </div>
                    </section>
                  </div>
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
                            <p className="user-panel__empty">No available slots right now.</p>
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
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onCancel={requestCancel}
                        onReschedule={
                          isServerBookingId(appointment.id) ? () => openReschedule(appointment) : undefined
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            ) : null}

            {/* added by Bonita - group meeting voting section */}
            {activeSection === 'group-meetings' ? (
              <section className="user-panel">

                {/* added by Bonita - paste invite link bar, always visible at top of section */}
                <div className="groupmeeting-card" style={{ marginBottom: '1.2rem' }}>
                  <h2>Join a Group Meeting</h2>
                  <p style={{ marginBottom: '0.7rem' }}>
                    Paste the invite link your professor shared with you, or open it directly in your browser.
                  </p>
                  {/* added by Bonita - input + button row for pasting the share URL */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="e.g. http://localhost:5173/user-dashboard?group=4"
                      value={groupLinkInput}
                      onChange={(e) => setGroupLinkInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGroupLinkSubmit() }} // added by Bonita - allow pressing Enter
                      style={{ flex: 1, padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #d3d3d3', font: 'inherit', fontSize: '0.88rem' }}
                    />
                    {/* added by Bonita - Go button triggers link parsing */}
                    <button
                      type="button"
                      className="groupmeeting-btn groupmeeting-btn--primary"
                      onClick={handleGroupLinkSubmit}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Go
                    </button>
                  </div>
                  {/* added by Bonita - show error if the pasted link has no group ID */}
                  {groupLinkError ? (
                    <p className="groupmeeting-error" style={{ marginTop: '0.4rem' }}>{groupLinkError}</p>
                  ) : null}
                </div>

                {/* added by Bonita - show voting UI if a group is loaded, otherwise show empty state */}
                {groupId ? (
                  <GroupMeetingVote meetingId={groupId} />
                ) : (
              <p className="user-panel__empty">Paste an invite link above to join one.</p>
		)}

                {/* added by Bonita (261097353) — show confirmed group meeting bookings below the invite/vote UI */}
                {(() => {
                  const confirmedGroupMeetings = appointments.filter((a) => a.slotType === 'group_meeting')
                  if (confirmedGroupMeetings.length === 0) return null
                  return (
                    <div style={{ marginTop: '1.4rem' }}>
                      <h2 style={{ marginBottom: '0.75rem' }}>My Confirmed Group Meetings</h2>
                      <div className="user-card-list">
                        {confirmedGroupMeetings.map((appt) => (
                          <div key={appt.id} className="groupmeeting-card" style={{ padding: '1rem 1.2rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{appt.title}</div>
                            <div style={{ fontSize: '0.88rem', color: '#555', marginBottom: '0.15rem' }}>{appt.dateLabel}</div>
                            <div style={{ fontSize: '0.88rem', color: '#555', marginBottom: '0.15rem' }}>{appt.timeRange}</div>
                            {appt.ownerName ? (
                              <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.3rem' }}>
                                Organized by {appt.ownerName}
                              </div>
                            ) : null}
                            {appt.recurringLabel ? (
                              <div style={{ fontSize: '0.78rem', color: '#c00', marginTop: '0.2rem' }}>Recurring</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </section>
            ) : null}

            {/* Added by Sophia */}
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
                      <p> {new Date((slot.slot_date)
                            .split('T')[0] + 'T12:00:00')
                            .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} - {slot.start_time} to {slot.end_time}
                      </p>

                      <button type="button" onClick={async () => {
                        try {
                          const response = await fetch(`/api/bookings/book-slot/${slot.id}`, {
                            method: 'POST',
                            credentials: 'include'
                          })
                          const data = await response.json()
                          if (!response.ok) {
                            alert(data.error || 'Could not reserve slot.')
                            return
                          }
                          await loadMyBookings()
                          await loadAvailableSlots()
                          setShowInviteModal(false)
                        } catch (err) {
                          console.error('Error reserving slot', err)
                          alert('Could not reserve slot.')
                        }
                      }}
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
                  <RequestMeetingForm owners={meetingOwnerOptions} onSubmit={handleSubmitRequest} />
                  <h2>My Requests</h2>
                  <div className="user-card-list">
                    {requests.map((request) => (
                      <UserRequestCard key={request.id} request={request} onUpdate={handleUpdateRequest} />
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
      {rescheduleTarget ? (
        <RescheduleBookingCard
          appointment={rescheduleTarget}
          slotOptions={rescheduleSlotOptions}
          isLoading={rescheduleLoading}
          errMsg={rescheduleErr}
          onClose={() => {
            if (!rescheduleLoading) {
              setRescheduleTarget(null)
              setRescheduleErr(null)
            }
          }}
          onConfirm={confirmReschedule}
        />
      ) : null}
    </div>
  )
}
