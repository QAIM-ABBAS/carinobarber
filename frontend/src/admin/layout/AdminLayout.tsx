import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MenuIcon } from './icons'
import Sidebar from './Sidebar'

/**
 * The shell of the admin area: the navigation on the right (desktop) and a top bar
 * with a drawer on the mobile. The public header is never shown here.
 */
export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const burgerRef = useRef<HTMLButtonElement>(null)
  const drawerWasOpen = useRef(false)

  // A new page closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // The focus returns to the burger when the drawer closes.
  useEffect(() => {
    if (drawerWasOpen.current && !drawerOpen) burgerRef.current?.focus()
    drawerWasOpen.current = drawerOpen
  }, [drawerOpen])

  return (
    <div className="ad-shell">
      <a className="ad-skip" href="#ad-content">
        رفتن به محتوای اصلی
      </a>

      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="ad-main">
        <header className="ad-topbar">
          <button
            type="button"
            className="ad-burger"
            ref={burgerRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={drawerOpen}
            aria-controls="ad-sidebar"
          >
            <MenuIcon />
          </button>
          <span className="ad-topbar__title">پنل مدیریت</span>
        </header>

        <div className="ad-content" id="ad-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
