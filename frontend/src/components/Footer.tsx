import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <a href="/#about" className="site-footer__link site-footer__link--right">
          درباره ما
        </a>
        <a href="/#contact" className="site-footer__link site-footer__link--left">
          تماس با ما
        </a>
      </div>
    </footer>
  )
}
