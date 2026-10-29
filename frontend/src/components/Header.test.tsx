import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import type { AuthUser } from '../auth/storage'
import Footer from './Footer'
import Header from './Header'

function authValue(user: AuthUser | null): AuthContextValue {
  return {
    user,
    token: user ? 'token' : null,
    isAuthenticated: user !== null,
    login: () => {},
    logout: () => {},
    refreshUser: async () => {},
  }
}

function renderHeader(user: AuthUser | null) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue(user)}>
        <Header />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const CUSTOMER: AuthUser = { id: 'u1', name: 'مشتری', phone: '09120000000' }
const ADMIN: AuthUser = { ...CUSTOMER, name: 'مدیر', is_admin: true }

afterEach(cleanup)

describe('the public header', () => {
  it('adds the admin item for the admin phone only', () => {
    renderHeader(ADMIN)

    const items = screen.getAllByRole('link', { name: 'پنل مدیریت' })
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) expect(item.getAttribute('href')).toBe('/admin/sso')
  })

  it('hides the admin item from a normal customer', () => {
    renderHeader(CUSTOMER)
    expect(screen.queryAllByRole('link', { name: 'پنل مدیریت' })).toHaveLength(0)
  })

  it('hides the admin item from a logged out visitor', () => {
    renderHeader(null)
    expect(screen.queryAllByRole('link', { name: 'پنل مدیریت' })).toHaveLength(0)
  })

  it('«تماس با ما» scrolls to the footer of the current page, not the home page', async () => {
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView

    function LocationProbe() {
      const { pathname, hash } = useLocation()
      return <output data-testid="location">{pathname + hash}</output>
    }

    try {
      render(
        <MemoryRouter initialEntries={['/services']}>
          <AuthContext.Provider value={authValue(null)}>
            <Header />
            <LocationProbe />
            <Footer />
          </AuthContext.Provider>
        </MemoryRouter>,
      )

      fireEvent.click(screen.getAllByRole('link', { name: 'تماس با ما' })[0])

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
      // The contact section of the page we were on received the focus…
      expect(document.getElementById('contact')).toBe(document.activeElement)
      // …and the route did not change.
      expect(screen.getByTestId('location').textContent).toBe('/services')
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('«درباره ما» opens the about page', () => {
    renderHeader(null)
    const links = screen.getAllByRole('link', { name: 'درباره ما' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/about')
    }
  })
})
