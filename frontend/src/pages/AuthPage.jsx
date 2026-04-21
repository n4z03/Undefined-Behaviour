// code written by Rupneet (ID: 261096653)

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AuthTabs from '../components/AuthTabs'
import LoginForm from '../components/LoginForm'
import SignupForm from '../components/SignupForm'
import SignupRulesPanel from '../components/SignupRulesPanel'
import '../styles/AuthPage.css'

function getModeFromSearch(search) {
  const mode = new URLSearchParams(search).get('mode')
  return mode === 'signup' ? 'signup' : 'login'
}

export default function AuthPage({ onLogin }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeMode, setActiveMode] = useState(getModeFromSearch(location.search))
  const role = useMemo(() => new URLSearchParams(location.search).get('role'), [location.search])

  useEffect(() => {
    setActiveMode(getModeFromSearch(location.search))
  }, [location.search])

  function changeMode(mode) {
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (mode === 'signup' && role === 'owner') params.set('role', 'owner')
    navigate(`/auth?${params.toString()}`)
  }

  return (
    <div className="app">
      <Navbar />
      <main className="app-main auth-page">
        <section className="auth-page__layout">
          <div className="auth-page__side auth-page__side--left">
            {activeMode === 'signup' ? <SignupRulesPanel /> : null}
          </div>
          <div className="auth-page__center">
            <div className="auth-card">
              <AuthTabs activeMode={activeMode} onModeChange={changeMode} />
              {activeMode === 'login' ? (
                <LoginForm onSwitchToSignup={() => changeMode('signup')} onLogin={onLogin} />
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
