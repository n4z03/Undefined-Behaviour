// code written by Rupneet (ID: 261096653)

import { useNavigate } from 'react-router-dom'
import '../styles/HeroSection.css'

export default function HeroSection() {
  const navigate = useNavigate()

  return (
    <div className="hero" id="hero">
      <div className="hero__card">
        <h1 className="hero__title">
          <span className="hero__title-line">Book</span>
          <span className="hero__title-line">
            <span className="hero__accent">Office Hours.</span>
          </span>
          <span className="hero__title-line">Request</span>
          <span className="hero__title-line">
            <span className="hero__accent">Meetings.</span>
          </span>
          <span className="hero__title-line">Manage Your</span>
          <span className="hero__title-line">
            <span className="hero__accent">Schedule.</span>
          </span>
        </h1>
        <button type="button" className="hero__cta" onClick={() => navigate('/auth')}>
          Browse Available Slots
        </button>
      </div>
    </div>
  )
}
