// code written by Rupneet (ID: 261096653)

import '../styles/QuickActions.css'

export default function QuickActions({ onJump }) {
  return (
    <section className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="quick-actions__buttons">
        <button type="button" onClick={() => onJump('create-slot')}>Create New Slot</button>
        <button type="button">Generate Invitation Link</button>
        <button type="button" onClick={() => onJump('group-scheduling')}>Schedule Group Meeting</button>
        <button type="button" onClick={() => onJump('export-calendar')}>Export Calendar</button>
      </div>
    </section>
  )
}
