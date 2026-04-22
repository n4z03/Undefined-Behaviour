// code written by Rupneet (ID: 261096653)

import { useState } from 'react'
import { detectRoleFromEmail, isAllowedMcGillEmail } from '../utils/authHelpers'
import '../styles/LoginForm.css'

export default function LoginForm({ onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = {}
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!isAllowedMcGillEmail(email)) nextErrors.email = 'Use a McGill email address.'
    if (!password.trim()) nextErrors.password = 'Password is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    // console.log('Login submit', { email, password, role: detectRoleFromEmail(email) })
    const role = detectRoleFromEmail(email)
try {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, role })
  })
  const data = await response.json()
  if (data.message === 'Logged in') {
    window.location.href = '/owner-dashboard'
  }
} catch (err) {
  console.error('Login error', err)
}
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-form__title">Log In</h2>
      <p className="auth-form__helper">Use your McGill email to access your dashboard.</p>

      <label className="auth-form__label" htmlFor="login-email">McGill Email</label>
      <input id="login-email" className="auth-form__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {errors.email ? <p className="auth-form__error">{errors.email}</p> : null}

      <label className="auth-form__label" htmlFor="login-password">Password</label>
      <div className="auth-form__password-row">
        <input id="login-password" className="auth-form__input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="button" className="auth-form__toggle" onClick={() => setShowPassword((v) => !v)}>
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      {errors.password ? <p className="auth-form__error">{errors.password}</p> : null}

      <button type="submit" className="auth-form__submit">Log In</button>
      <p className="auth-form__switch">Don't have an account? <button type="button" onClick={onSwitchToSignup}>Sign Up</button></p>
    </form>
  )
}
