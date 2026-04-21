// code written by Rupneet (ID: 261096653)

import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import FeatureGrid from './components/FeatureGrid'
import HowItWorksSection from './components/HowItWorksSection'
import Footer from './components/Footer'
import './styles/App.css'

function App() {
  // Which feature tile is “open”; null means nothing selected (accordion closed)
  const [activeFeature, setActiveFeature] = useState(null)

  function handleFeatureClick(id) {
    setActiveFeature((prev) => (prev === id ? null : id))
  }

  // Scroll after the accordion mounts (not in the same tick as setState)
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

export default App
