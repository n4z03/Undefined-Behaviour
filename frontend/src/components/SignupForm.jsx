// code written by Rupneet (ID: 261096653)
// code added by Nazifa Ahmed (261112966)

import { useMemo, useState } from 'react'
import { detectRoleFromEmail } from '../utils/authHelpers'
import '../styles/LoginForm.css'
import '../styles/SignupForm.css'

export default function SignupForm({ ownerHint, onSwitchToLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState('')

  const detectedRole = useMemo(() => detectRoleFromEmail(email), [email])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitMessage('')
    const nextErrors = {}
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!detectedRole) nextErrors.email = 'Only @mcgill.ca and @mail.mcgill.ca are allowed.'
    if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters.'
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords must match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSubmitMessage(data.error || 'Signup failed.')
        return
      }

      setSubmitMessage('Signup successful.')
      setErrors({})
    } catch (error) {
      setSubmitMessage('Unable to reach the server. Please try again.')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-form__title">Create an Account</h2>
      <p className="auth-form__helper">Only McGill email addresses can register.</p>

      {ownerHint ? <p className="auth-form__hint">Ready for owner registration. Final role is based on email domain.</p> : null}

      <label className="auth-form__label" htmlFor="signup-name">Full Name</label>
      <input id="signup-name" className="auth-form__input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      {errors.fullName ? <p className="auth-form__error">{errors.fullName}</p> : null}

      <label className="auth-form__label" htmlFor="signup-email">McGill Email</label>
      <input id="signup-email" className="auth-form__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {detectedRole === 'owner' ? (
        <p className="auth-form__role auth-form__role--owner">This creates an Admin account.</p>
      ) : null}
      {detectedRole === 'student' ? (
        <p className="auth-form__role auth-form__role--student">This email will create a Student account.</p>
      ) : null}
      {!detectedRole && email.trim() ? <p className="auth-form__error">Only @mcgill.ca and @mail.mcgill.ca emails are allowed.</p> : null}
      {errors.email ? <p className="auth-form__error">{errors.email}</p> : null}

      <label className="auth-form__label" htmlFor="signup-password">Password</label>
      <input id="signup-password" className="auth-form__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {errors.password ? <p className="auth-form__error">{errors.password}</p> : null}

      <label className="auth-form__label" htmlFor="signup-confirm">Confirm Password</label>
      <input id="signup-confirm" className="auth-form__input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      {errors.confirmPassword ? <p className="auth-form__error">{errors.confirmPassword}</p> : null}

      <button type="submit" className="auth-form__submit">Create Account</button>
      {submitMessage ? <p className="auth-form__submit-message">{submitMessage}</p> : null}
      <p className="auth-form__switch">Already have an account? <button type="button" onClick={onSwitchToLogin}>Log In</button></p>
    </form>
  )
}
