// code written by Rupneet (ID: 261096653)

import '../styles/ExportPanel.css'

export default function ExportPanel({ compact = false, showHeading = true }) {
  return (
    <section className={`export-panel${compact ? ' export-panel--compact' : ''}`}>
      {showHeading ? <h3>Export to Calendar</h3> : null}
      <div className="export-panel__actions">
        <button type="button">Export to Google Calendar</button>
        <button type="button">Export to Outlook</button>
      </div>
      <p className="export-panel__note">Automatic sync can be configured in a future version.</p>
    </section>
  )
}
