// code written by Rupneet (ID: 261096653)

import { featureTiles } from '../data/featureContent'
import '../styles/FeatureGrid.css'

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
