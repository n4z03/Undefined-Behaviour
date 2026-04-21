// code written by Rupneet (ID: 261096653)

import '../styles/AuthTabs.css'

export default function AuthTabs({ activeMode, onModeChange }) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Auth mode">
      <button
        type="button"
        className={`auth-tabs__btn${activeMode === 'login' ? ' auth-tabs__btn--active' : ''}`}
        onClick={() => onModeChange('login')}
      >
        Log In
      </button>
      <button
        type="button"
        className={`auth-tabs__btn${activeMode === 'signup' ? ' auth-tabs__btn--active' : ''}`}
        onClick={() => onModeChange('signup')}
      >
        Sign Up
      </button>
    </div>
  )
}
