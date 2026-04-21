// code written by Rupneet (ID: 261096653)

import '../styles/ExportPanel.css'

export default function ExportPanel() {
  return (
    <section className="export-panel">
      <h3>Export to Calendar</h3>
      <p>Export your appointments to Google Calendar or Outlook.</p>
      <div className="export-panel__actions">
        <button type="button">Export to Google Calendar</button>
        <button type="button">Export to Outlook</button>
      </div>
      <p className="export-panel__note">Automatic sync can be configured in a future version.</p>
    </section>
  )
}
