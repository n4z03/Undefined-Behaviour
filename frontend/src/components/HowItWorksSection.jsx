// code written by Rupneet (ID: 261096653)

import '../styles/HowItWorksSection.css'

const featureContent = {
  'how-it-works': {
    title: 'How it Works',
    titleAccent: 'How it',
    titleMain: 'Works.',
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
    titleAccent: 'Request a',
    titleMain: 'Meeting.',
    bullets: [
      'Students can send a meeting request to a professor or TA',
      'The admin can review the request from their dashboard',
      'If accepted, a booking slot is created automatically',
      'The appointment then appears in both dashboards',
    ],
  },
  'export-calendar': {
    title: 'Export to Calendar',
    titleAccent: 'Export to',
    titleMain: 'Calendar.',
    bullets: [
      'Students can export appointments to Google Calendar or Outlook',
      'This helps keep office hours and meetings organized',
      'The feature should be presented as one of the project’s highlighted functions',
      'Both students and admins can export their appointments',
    ],
  },
  'group-scheduling': {
    title: 'Group Scheduling',
    titleAccent: 'Group',
    titleMain: 'Scheduling.',
    bullets: [
      'Admins can define possible meeting times',
      'Invited students can indicate which times work for them',
      'The system helps identify the best slot',
      'Shared meetings can then be scheduled more efficiently',
    ],
  },
}

export default function HowItWorksSection({ activeFeature }) {
  const panel = featureContent[activeFeature]

  return (
    <section className="feature-accordion" id="feature-accordion" aria-label={panel.title}>
      <div className="feature-accordion__inner">
        <h2 className="feature-accordion__title">
          <span className="feature-accordion__title-accent">{panel.titleAccent || panel.title}</span>{' '}
          {panel.titleMain ? <span className="feature-accordion__title-main">{panel.titleMain}</span> : null}
        </h2>
        <div className="feature-accordion__columns">
          <div className="feature-accordion__text">
            <ul className="feature-accordion__list">
              {panel.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="feature-accordion__visual" aria-hidden="true">
            <div className="feature-accordion__red-block" />
            <div className="feature-accordion__image-card">picture of dashboard</div>
          </div>
        </div>
      </div>
    </section>
  )
}
