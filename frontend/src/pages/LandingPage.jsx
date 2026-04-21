// code written by Rupneet (ID: 261096653)

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import FeatureGrid from '../components/FeatureGrid'
import HowItWorksSection from '../components/HowItWorksSection'
import Footer from '../components/Footer'

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  function handleFeatureClick(id) {
    setActiveFeature((prev) => (prev === id ? null : id))
  }

  useEffect(() => {
    if (!activeFeature) return
    const frame = requestAnimationFrame(() => {
      document.getElementById('feature-accordion')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeFeature])

  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section')
    if (!section) return
    const id = section === 'how' ? 'feature-accordion' : 'browse-slots'
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    navigate('/', { replace: true })
  }, [location.search, navigate])

  return (
    <div className="app">
      <Navbar />
      <main className={`app-main${activeFeature ? '' : ' app-main--no-accordion'}`}>
        <section className="landing-top" id="browse-slots" aria-label="Browse slots and features">
          <div className="landing-top__inner">
            <HeroSection />
            <FeatureGrid activeFeature={activeFeature} onFeatureClick={handleFeatureClick} />
          </div>
        </section>
        {activeFeature ? <HowItWorksSection activeFeature={activeFeature} /> : null}
      </main>
      <Footer />
    </div>
  )
}
