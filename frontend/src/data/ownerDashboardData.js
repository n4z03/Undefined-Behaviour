// code written by Rupneet (ID: 261096653)

export const sidebarSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'my-slots', label: 'My Slots' },
  { id: 'create-slot', label: 'Create Slot' },
  { id: 'meeting-requests', label: 'Meeting Requests' },
  { id: 'group-scheduling', label: 'Group Scheduling' },
  { id: 'recurring-hours', label: 'Recurring Office Hours' },
  { id: 'export-calendar', label: 'Export Calendar' },
]

export const summaryCards = [
  { id: 'active', label: 'Active Slots', value: 8, note: 'Visible to students' },
  { id: 'private', label: 'Private Slots', value: 5, note: 'Only visible to you' },
  { id: 'booked', label: 'Booked Appointments', value: 12, note: 'Upcoming confirmed meetings' },
  { id: 'pending', label: 'Pending Requests', value: 3, note: 'Awaiting response' },
]

export const slots = [
  {
    id: 1,
    title: 'Office Hours Slot',
    date: 'Tuesday, April 23',
    timeRange: '10:00 AM - 10:30 AM',
    visibility: 'Public',
    booking: 'Booked',
    bookedBy: 'Rupneet Shahriar',
    recurringLabel: 'Repeats weekly',
  },
  {
    id: 2,
    title: 'Assignment Help Slot',
    date: 'Wednesday, April 24',
    timeRange: '2:00 PM - 2:30 PM',
    visibility: 'Private',
    booking: 'Available',
    bookedBy: null,
    recurringLabel: null,
  },
  {
    id: 3,
    title: 'Project Consultation',
    date: 'Thursday, April 25',
    timeRange: '1:00 PM - 1:45 PM',
    visibility: 'Public',
    booking: 'Available',
    bookedBy: null,
    recurringLabel: null,
  },
]

export const meetingRequests = [
  {
    id: 1,
    name: 'Nazifa Ahmed',
    email: 'Nazifa.Ahmed@mail.mcgill.ca',
    topic: 'Need help with assignment 3.',
    requestedAt: 'Apr 22, 9:14 AM',
    status: 'Pending',
  },
  {
    id: 2,
    name: 'Sophia Casalme',
    email: 'sophia.casalme@mail.mcgill.ca',
    topic: 'Can we review my project proposal?',
    requestedAt: 'Apr 22, 1:27 PM',
    status: 'Pending',
  },

  {
    id: 3,
    name: 'Bonita Baladi',
    email: 'bonita.baladi@mail.mcgill.ca',
    topic: 'Assignment 2 Review',
    requestedAt: 'Apr 22, 1:27 PM',
    status: 'Pending',
  },
]

export const groupMeetings = [
  {
    id: 1,
    title: 'COMP 307 Demo Prep',
    invitees: 4,
    possibleTimes: 7,
    status: 'Ready to Finalize',
  },
  {
    id: 2,
    title: 'TA Coordination Meeting',
    invitees: 3,
    possibleTimes: 5,
    status: 'Collecting Responses',
  },
]

export const recurringHours = [
  {
    id: 1,
    title: 'Weekly Office Hours',
    days: 'Mondays and Wednesdays',
    timeRange: '2:00 PM - 3:00 PM',
    weeks: 6,
    status: 'Active',
  },
  {
    id: 2,
    title: 'Quiz Support Hour',
    days: 'Fridays',
    timeRange: '10:30 AM - 11:30 AM',
    weeks: 4,
    status: 'Draft',
  },
]
