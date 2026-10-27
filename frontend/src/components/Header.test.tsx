import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import type { AuthUser } from '../auth/storage'
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
})
