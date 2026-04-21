// code written by Rupneet (ID: 261096653)
// code added by Nazifa Ahmed (261112966)

import { useState } from 'react'
import { isAllowedMcGillEmail } from '../utils/authHelpers'
import '../styles/LoginForm.css'

export default function LoginForm({ onSwitchToSignup, onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitMessage('')
    const nextErrors = {}
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!isAllowedMcGillEmail(email)) nextErrors.email = 'Use a McGill email address.'
    if (!password.trim()) nextErrors.password = 'Password is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSubmitMessage(data.error || 'Login failed.')
        return
      }

      console.log('Logged in user', data.user)
      setSubmitMessage('Login successful.')
      setErrors({})
      if (onLogin) onLogin(data.user)
    } catch (error) {
      setSubmitMessage('Unable to reach server. Please try again.')
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
      {submitMessage ? <p className="auth-form__submit-message">{submitMessage}</p> : null}
      <p className="auth-form__switch">Don't have an account? <button type="button" onClick={onSwitchToSignup}>Sign Up</button></p>
    </form>
  )
}
