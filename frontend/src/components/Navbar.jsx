// code written by Rupneet (ID: 261096653)
// logout functionality added by Sophia

import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import '../styles/Navbar.css'

export default function Navbar({ variant = 'default' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isOwnerNav = variant === 'owner'
  const isUserNav = variant === 'user'
  const isAuthPage = location.pathname === '/auth' && !isOwnerNav && !isUserNav

  return (
    <header className={`navbar${isAuthPage ? ' navbar--auth' : ''}`}>
      <div className="navbar__inner">
        <a
          href="/"
          className="navbar__brand"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
        >
          Mc<span className="navbar__brand-book">Book.</span>
        </a>

        <div className="navbar__right">
          {isOwnerNav ? (
            <>
              <nav className="navbar__nav" aria-label="Admin actions">
                <button type="button" className="navbar__link navbar__link--pill" onClick={async () => {
                await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                navigate('/auth?mode=login')}}>
                  Log Out
                </button>
              </nav>
              <span className="navbar__account-label">Admin Account</span>
            </>
          ) : isUserNav ? (
            <>
              <nav className="navbar__nav" aria-label="Student actions">
                <button type="button" className="navbar__link navbar__link--pill" onClick={async () => {
                  await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                  navigate('/auth?mode=login')}}>
                  Log Out
                </button>
              </nav>
              <span className="navbar__account-label">Student Account</span>
            </>
          ) : (
            <>
              <div className="navbar__actions">
                <button type="button" className="navbar__btn navbar__btn--login" onClick={() => navigate('/auth?mode=login')}>
                  Log In
                </button>
                <button type="button" className="navbar__btn navbar__btn--signup" onClick={() => navigate('/auth?mode=signup&role=owner')}>
                  Sign Up
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
