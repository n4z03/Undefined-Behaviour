// User dashboard mock content shaped for student flows

export const userSidebarSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'browse-slots', label: 'Browse Slots' },
  { id: 'my-appointments', label: 'My Appointments' },
  { id: 'requests', label: 'Requests' },
  { id: 'export', label: 'Export to Calendar' },
]

export const owners = [
  { id: 'owner-1', name: 'Prof. Vybihal', email: 'vybihal@mcgill.ca' },
  { id: 'owner-2', name: 'Sarah Chen', email: 'sarah.chen@mcgill.ca' },
  { id: 'owner-3', name: 'Adam Lee', email: 'adam.lee@mcgill.ca' },
]

export const availableSlotsSeed = [
  {
    id: 'avail-1',
    ownerId: 'owner-1',
    ownerName: 'Prof. Vybihal',
    ownerEmail: 'vybihal@mcgill.ca',
    title: 'Office Hours',
    dateLabel: 'Tuesday, April 23',
    timeRange: '10:00 AM - 10:30 AM',
    status: 'Available',
    visibility: 'Public',
    recurringLabel: null,
  },
  {
    id: 'avail-2',
    ownerId: 'owner-1',
    ownerName: 'Prof. Vybihal',
    ownerEmail: 'vybihal@mcgill.ca',
    title: 'Project Check-In',
    dateLabel: 'Thursday, April 25',
    timeRange: '2:00 PM - 2:30 PM',
    status: 'Available',
    visibility: 'Public',
    recurringLabel: null,
  },
  {
    id: 'avail-3',
    ownerId: 'owner-2',
    ownerName: 'Sarah Chen',
    ownerEmail: 'sarah.chen@mcgill.ca',
    title: 'Assignment Help',
    dateLabel: 'Wednesday, April 24',
    timeRange: '3:00 PM - 3:30 PM',
    status: 'Available',
    visibility: 'Public',
    recurringLabel: 'Weekly slot',
  },
  {
    id: 'avail-4',
    ownerId: 'owner-3',
    ownerName: 'Adam Lee',
    ownerEmail: 'adam.lee@mcgill.ca',
    title: 'Quiz Review',
    dateLabel: 'Friday, April 26',
    timeRange: '11:00 AM - 11:30 AM',
    status: 'Available',
    visibility: 'Public',
    recurringLabel: null,
  },
]

export const appointmentsSeed = [
  {
    id: 'appt-1',
    ownerName: 'Prof. Vybihal',
    ownerEmail: 'vybihal@mcgill.ca',
    title: 'COMP 307 Project Check-In',
    dateLabel: 'Thursday, April 25',
    timeRange: '2:00 PM - 2:30 PM',
    status: 'Confirmed',
    recurringLabel: null,
  },
  {
    id: 'appt-2',
    ownerName: 'Sarah Chen',
    ownerEmail: 'sarah.chen@mcgill.ca',
    title: 'Assignment 2 Feedback',
    dateLabel: 'Friday, April 26',
    timeRange: '12:00 PM - 12:30 PM',
    status: 'Confirmed',
    recurringLabel: null,
  },
]

export const requestSeed = [
  {
    id: 'req-u-1',
    ownerName: 'Sarah Chen',
    ownerEmail: 'sarah.chen@mcgill.ca',
    message: 'Can we review assignment 2?',
    status: 'Pending',
    createdAt: 'Apr 22, 9:14 AM',
  },
  {
    id: 'req-u-2',
    ownerName: 'Prof. Vybihal',
    ownerEmail: 'vybihal@mcgill.ca',
    message: 'Requesting advice for final project scope.',
    status: 'Accepted',
    createdAt: 'Apr 21, 3:47 PM',
  },
]
