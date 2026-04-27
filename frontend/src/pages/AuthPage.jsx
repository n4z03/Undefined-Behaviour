// code written by Rupneet (ID: 261096653)
// Code added by Nazifa (261112966), and Sophia (261149930)

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoginForm from '../components/LoginForm'
import SignupForm from '../components/SignupForm'
import '../styles/AuthPage.css'

function getModeFromSearch(search) {
  const mode = new URLSearchParams(search).get('mode')
  return mode === 'signup' ? 'signup' : 'login'
}

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeMode, setActiveMode] = useState(getModeFromSearch(location.search))
  const redirectPath = new URLSearchParams(location.search).get('redirect') // added by sophia

  // Redirect already-logged-in users away from the auth page
  // Added by nazifa
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) return
        const dest = redirectPath || (data.user.role === 'owner' ? '/owner-dashboard' : '/user-dashboard')
        navigate(dest, { replace: true })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setActiveMode(getModeFromSearch(location.search))
  }, [location.search])

  function changeMode(mode) {
    const params = new URLSearchParams()
    params.set('mode', mode)
    navigate(`/auth?${params.toString()}`)
  }

  return (
    <div className="app">
      <Navbar />
      <main className="app-main auth-page">
        <section className="auth-page__layout">
          <div className="auth-page__side auth-page__side--left" />
          <div className="auth-page__center">
            <div className="auth-card">
              {activeMode === 'login' ? (
                <LoginForm // added by sophia
                  onSwitchToSignup={() => changeMode('signup')} 
                  onLogin={(user) => {
                    if (redirectPath) {
                      navigate(decodeURIComponent(redirectPath))
                    } else if (user.role === 'owner') {
                      navigate('/owner-dashboard')
                    } else {
                      navigate('/user-dashboard')
                    }
                  }}/>
              ) : (
                <SignupForm onSwitchToLogin={() => changeMode('login')} />
              )}
            </div>
          </div>
          <div className="auth-page__side auth-page__side--right" aria-hidden="true" />
        </section>
      </main>
      <Footer />
    </div>
  )
}
