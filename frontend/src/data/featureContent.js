// code written by Rupneet (ID: 261096653)

// Copy for each feature tile / accordion panel
export const featureContent = {
  'how-it-works': {
    title: 'How it Works',
    bullets: [
      'Sign up using your McGill email',
      'Browse available office hours and appointment slots',
      'Request a meeting or reserve a published slot',
      'Manage upcoming bookings from your dashboard',
      'Export appointments to your calendar',
    ],
  },
  'request-meeting': {
    title: 'Request a Meeting',
    bullets: [
      'Students can send a meeting request to a professor or TA',
      'The admin can review the request from their dashboard',
      'If accepted, a booking slot is created automatically',
      'The appointment then appears in both dashboards',
    ],
  },
  'export-calendar': {
    title: 'Export to Calendar',
    bullets: [
      'Students can export appointments to Google Calendar or Outlook',
      'This helps keep office hours and meetings organized',
      'The feature should be presented as one of the project’s highlighted functions',
      'Both students and admins can export their appointments',
    ],
  },
  'group-scheduling': {
    title: 'Group Scheduling',
    bullets: [
      'Admins can define possible meeting times',
      'Invited students can indicate which times work for them',
      'The system helps identify the best slot',
      'Shared meetings can then be scheduled more efficiently',
    ],
  },
}

export const featureTiles = [
  { id: 'how-it-works', label: 'How it Works', variant: 'gray' },
  { id: 'request-meeting', label: 'Request a Meeting', variant: 'red' },
  { id: 'export-calendar', label: 'Export to Calendar', variant: 'red' },
  { id: 'group-scheduling', label: 'Group Scheduling', variant: 'gray' },
]
