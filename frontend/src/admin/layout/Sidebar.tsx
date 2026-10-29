import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useFocusTrap } from '../lib/useFocusTrap'
import { useMediaQuery } from '../lib/useMediaQuery'
import {
  CalendarIcon,
  DashboardIcon,
  LogoutIcon,
  ScissorsMark,
  ServicesIcon,
  SettingsIcon,
} from './icons'

export interface SidebarProps {
  /** The drawer is open (mobile only). */
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/admin', label: 'داشبورد', icon: DashboardIcon, end: true },
  { to: '/admin/bookings', label: 'نوبت‌ها', icon: CalendarIcon, end: false },
  { to: '/admin/services', label: 'خدمات', icon: ServicesIcon, end: false },
  { to: '/admin/settings', label: 'تنظیمات', icon: SettingsIcon, end: false },
]

/**
 * The navigation of the admin panel: a fixed column on the right (desktop) and a
 * drawer on the mobile (the focus stays inside it and Escape closes it).
 */
export default function Sidebar({ open, onClose }: SidebarProps) {
  const { logout } = useAuth()
  const panelRef = useRef<HTMLElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useFocusTrap(open && !isDesktop, panelRef, onClose)

  return (
    <>
      <div
        className="ad-overlay"
        data-open={open}
        hidden={!open}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="ad-sidebar"
        id="ad-sidebar"
        data-open={open}
        data-desktop={isDesktop}
        ref={panelRef}
      >
        <div className="ad-sidebar__brand">
          <span className="ad-logo" aria-hidden="true">
            <ScissorsMark />
          </span>
          <span className="ad-sidebar__brand-text">
            <strong>Carino Barber</strong>
            <small>پنل مدیریت</small>
          </span>
        </div>

        <nav className="ad-nav" aria-label="ناوبری پنل مدیریت">
          <ul>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `ad-nav__link ${isActive ? 'is-active' : ''}`.trim()
                    }
                    onClick={onClose}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ad-sidebar__foot">
          <button type="button" className="ad-logout" onClick={() => logout()}>
            <LogoutIcon />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>
    </>
  )
}
