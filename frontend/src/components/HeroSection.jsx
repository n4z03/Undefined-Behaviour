// code written by Rupneet (ID: 261096653)

import '../styles/HeroSection.css'

function scrollToBrowse() {
  const el = document.getElementById('browse-slots')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function HeroSection() {
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
        <button type="button" className="hero__cta" onClick={scrollToBrowse}>
          Browse Available Slots
        </button>
      </div>
    </div>
  )
}
