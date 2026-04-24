// User dashboard mock content shaped for student flows

export const userSidebarSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'browse-slots', label: 'Browse Slots' },
  { id: 'my-appointments', label: 'My Appointments' },
  { id: 'group-meetings', label: 'Group Meetings' },
  { id: 'requests', label: 'Requests' },
  { id: 'export', label: 'Export to Calendar' },
]

export const owners = [
  { id: 'owner-1', name: 'Prof. Vybihal', email: 'vybihal@mcgill.ca' },
  { id: 'owner-2', name: 'Sarah Chen', email: 'sarah.chen@mcgill.ca' },
  { id: 'owner-3', name: 'Adam Lee', email: 'adam.lee@mcgill.ca' },
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
