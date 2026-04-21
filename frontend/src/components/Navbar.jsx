// code written by Rupneet (ID: 261096653)

import '../styles/Navbar.css'

function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a
          href="#browse-slots"
          className="navbar__brand"
          onClick={(e) => {
            e.preventDefault()
            scrollToId('browse-slots')
          }}
        >
          Mc<span className="navbar__brand-book">Book.</span>
        </a>

        <div className="navbar__right">
          <nav className="navbar__nav" aria-label="Main">
            <button
              type="button"
              className="navbar__link navbar__link--pill"
              onClick={() => scrollToId('browse-slots')}
            >
              Book a Slot
            </button>
            <button
              type="button"
              className="navbar__link navbar__link--pill"
              onClick={() => scrollToId('feature-accordion')}
            >
              Details
            </button>
          </nav>
          <div className="navbar__actions">
            <button type="button" className="navbar__btn navbar__btn--login">
              Log In
            </button>
            <button type="button" className="navbar__btn navbar__btn--signup">
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
