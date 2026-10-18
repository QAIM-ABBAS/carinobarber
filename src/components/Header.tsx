import { useEffect, useState } from 'react'
import { brand, navItems, socials } from '../data/content'
import { CloseIcon, InstagramIcon, MenuIcon, ScissorsMark, TikTokIcon } from './icons'

const socialIcons = { instagram: InstagramIcon, tiktok: TikTokIcon }

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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="hero__header">
      <div className="hero__bar">
        <a href="#top" className="logo" aria-label={brand.name}>
          <ScissorsMark />
        </a>

        <nav className="hero__nav" aria-label="ناوبری اصلی">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="nav-link">
                  {item.label}
                </a>
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
          {navItems.map((item) => (
            <li key={item.href}>
              <a href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <Socials className="mobile-menu__social" />
      </div>
    </header>
  )
}
