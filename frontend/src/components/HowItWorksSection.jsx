// code written by Rupneet (ID: 261096653)

import { featureContent } from '../data/featureContent'
import '../styles/HowItWorksSection.css'

export default function HowItWorksSection({ activeFeature }) {
  const panel = featureContent[activeFeature]

  return (
    <section className="feature-accordion" id="feature-accordion" aria-label={panel.title}>
      <div className="feature-accordion__inner">
        <h2 className="feature-accordion__title">{panel.title}</h2>
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
