// code written by Rupneet (ID: 261096653)

import '../styles/FeatureGrid.css'

const featureTiles = [
  { id: 'how-it-works', label: 'How it Works', variant: 'gray' },
  { id: 'request-meeting', label: 'Request a Meeting', variant: 'red' },
  { id: 'export-calendar', label: 'Export to Calendar', variant: 'red' },
  { id: 'group-scheduling', label: 'Group Scheduling', variant: 'gray' },
]

export default function FeatureGrid({ activeFeature, onFeatureClick }) {
  return (
    <div className="feature-grid" role="group" aria-label="Feature shortcuts">
      {featureTiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={
            'feature-tile' +
            (tile.variant === 'red' ? ' feature-tile--red' : ' feature-tile--gray') +
            (activeFeature === tile.id ? ' feature-tile--active' : '')
          }
          onClick={() => onFeatureClick(tile.id)}
          aria-pressed={activeFeature === tile.id}
        >
          {tile.label}
        </button>
      ))}
    </div>
  )
}
