import '../styles/Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand">
          Mc<span className="site-footer__brand-book">Book.</span>
        </span>
        <div className="site-footer__meta">
          <span>Built for COMP 307 — McGill University</span>
          <span>© 2026 Team Undefined Behaviour</span>
        </div>
      </div>
    </footer>
  )
}
