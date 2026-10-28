import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { brand, navItems, socials } from '../data/content'
import { CloseIcon, InstagramIcon, MenuIcon, TelegramIcon } from './icons'
import './Header.css'

const socialIcons = { instagram: InstagramIcon, telegram: TelegramIcon }

/** The extra item of a customer whose verified phone belongs to the admin. */
const ADMIN_NAV_ITEM = { label: 'پنل مدیریت', href: '/admin/sso' }

/** Scroll to a footer anchor, waiting a few frames if the home route must render first. */
function scrollToId(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let tries = 0
  const attempt = () => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      el.focus({ preventScroll: true })
      return
    }
    if (tries++ < 12) requestAnimationFrame(attempt)
  }
  attempt()
}

function Socials({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {socials.map(({ label, href, icon }) => {
        const Icon = socialIcons[icon]
        return (
          <li key={icon}>
            <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label} className="social-link">
              <Icon />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const items = user?.is_admin === true ? [...navItems, ADMIN_NAV_ITEM] : navItems

  /** «درباره ما» / «تماس با ما» jump to the footer sections, from any page. */
  const gotoSection = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('/#')) return
    e.preventDefault()
    setOpen(false)
    navigate(href)
    scrollToId(href.slice(2))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="hero__header">
      <div className="hero__bar">
        <Link to="/" className="logo" aria-label={brand.name}>
          <img
            className="logo__img"
            src="/logo/Carino%20Barber%20Monochrome%20Crest.png"
            alt=""
            width={48}
            height={48}
          />
        </Link>

        <nav className="hero__nav" aria-label="ناوبری اصلی">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`nav-link${item.href === ADMIN_NAV_ITEM.href ? ' nav-link--admin' : ''}`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={(e) => gotoSection(e, item.href)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Socials className="hero__social" />

        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'بستن منو' : 'باز کردن منو'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div id="mobile-menu" className="mobile-menu" data-open={open} hidden={!open}>
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={item.href === ADMIN_NAV_ITEM.href ? 'nav-link--admin' : undefined}
                onClick={(e) => gotoSection(e, item.href)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Socials className="mobile-menu__social" />
      </div>
    </header>
  )
}
