// code written by Rupneet (ID: 261096653)

import { useMemo, useState } from 'react'
import { detectRoleFromEmail, ROLE_OWNER, ROLE_USER } from '../utils/authHelpers'
import '../styles/LoginForm.css'
import '../styles/SignupForm.css'

export default function SignupForm({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})

  const detectedRole = useMemo(() => detectRoleFromEmail(email), [email])

  function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = {}
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!detectedRole) nextErrors.email = 'Only @mcgill.ca and @mail.mcgill.ca are allowed.'
    if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters.'
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords must match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    console.log('Signup submit', { fullName, email, password, role: detectedRole })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-form__title">Create an Account</h2>
      <p className="auth-form__helper">Only McGill email addresses can register.</p>

      <label className="auth-form__label" htmlFor="signup-name">Full Name</label>
      <input id="signup-name" className="auth-form__input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      {errors.fullName ? <p className="auth-form__error">{errors.fullName}</p> : null}

      <label className="auth-form__label" htmlFor="signup-email">McGill Email</label>
      <input id="signup-email" className="auth-form__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {detectedRole === ROLE_OWNER ? (
        <p className="auth-form__role auth-form__role--admin">This creates an Admin account.</p>
      ) : null}
      {detectedRole === ROLE_USER ? (
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
      <p className="auth-form__switch">Already have an account? <button type="button" onClick={onSwitchToLogin}>Log In</button></p>
    </form>
  )
}
