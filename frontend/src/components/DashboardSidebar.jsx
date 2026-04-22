// code written by Rupneet (ID: 261096653)

import '../styles/DashboardSidebar.css'

export default function DashboardSidebar({ sections, activeSection, onSelect }) {
  return (
    <aside className="dashboard-sidebar">
      <nav aria-label="Admin dashboard sections">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`dashboard-sidebar__item${activeSection === section.id ? ' dashboard-sidebar__item--active' : ''}`}
            onClick={() => onSelect(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
