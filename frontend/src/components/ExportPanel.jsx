// code written by Rupneet (ID: 261096653)
// .ics export functionality added by Bonita Baladi (261097353)

import { useState } from 'react'
import { apiFetch } from '../api'
import '../styles/ExportPanel.css'
 
export default function ExportPanel({ compact = false, showHeading = true, isOwner = false }) {
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
 
  // Fetch the .ics file from the backend and trigger a browser download
  async function handleExport(calendarType) {
    setError(null)
    setExporting(true)
 
    const endpoint = isOwner
      ? '/api/calendar/export/owner'
      : '/api/calendar/export'
 
    try {
      const response = await apiFetch(endpoint, {
        method: 'GET',
        credentials: 'include',  // send session cookie
      })
 
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Export failed.')
        return
      }
 
      // Get the .ics file as a blob and trigger download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = isOwner ? 'mcbook-schedule.ics' : 'mcbook-appointments.ics'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
 
      // For Google Calendar, open the import page in a new tab after download
      if (calendarType === 'google') {
        window.open('https://calendar.google.com/calendar/r/settings/import', '_blank')
      }
      // For Outlook, open the calendar so the user can drag-and-drop the downloaded .ics file
      if (calendarType === 'outlook') {
        window.open('https://outlook.live.com/calendar/', '_blank')
      }
 
    } catch (err) {
      setError('Could not connect to the server.')
    } finally {
      setExporting(false)
    }
  }
 
  return (
    <section className={`export-panel${compact ? ' export-panel--compact' : ''}`}>
      {showHeading ? <h3>Export to Calendar</h3> : null}
      <div className="export-panel__actions">
        <button
          type="button"
          onClick={() => handleExport('google')}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export to Google Calendar'}
        </button>
        <button
          type="button"
          onClick={() => handleExport('outlook')}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export to Outlook'}
        </button>
      </div>
      {error ? <p className="export-panel__error">{error}</p> : null}
      <p className="export-panel__note">
        Downloads a .ics file, then opens the calendar import page so you can upload it.
      </p>
    </section>
  )
}

