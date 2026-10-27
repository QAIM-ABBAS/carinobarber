import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { writeSession } from '../../auth/storage'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import AdminSsoPage from './AdminSsoPage'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function renderPage(adoptSession: Mock, authenticated = false) {
  const value: AuthContextValue = {
    token: authenticated ? 'admin-token' : null,
    isAuthenticated: authenticated,
    login: vi.fn(),
    adoptSession,
    logout: vi.fn(),
    notice: null,
    clearNotice: vi.fn(),
  }

  return render(
    <MemoryRouter initialEntries={['/admin/sso']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/admin/sso" element={<AdminSsoPage />} />
          <Route path="/admin" element={<p>داشبورد مدیر</p>} />
          <Route path="/admin/login" element={<p>ورود مدیر</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the phone based admin entry', () => {
  it('sends a visitor without a customer session to the admin login', async () => {
    renderPage(vi.fn())

    expect(await screen.findByText('ورود مدیر')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exchanges the customer session and opens the dashboard', async () => {
    writeSession('customer-token', { id: 'u1', name: 'مدیر', phone: '09129999999' }, 3600)
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: 'admin-token', token_type: 'bearer', expires_in: 43200 }),
    )
    const adoptSession = vi.fn()

    renderPage(adoptSession)

    expect(await screen.findByText('داشبورد مدیر')).toBeTruthy()
    expect(adoptSession).toHaveBeenCalledWith('admin-token', 43200)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/session')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer customer-token')
  })

  it('shows the server refusal for a non-admin customer', async () => {
    writeSession('customer-token', { id: 'u1', name: 'مشتری', phone: '09120000000' }, 3600)
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'forbidden',
            message: 'این حساب کاربری به پنل مدیریت دسترسی ندارد.',
            details: null,
          },
        },
        403,
      ),
    )
    const adoptSession = vi.fn()

    renderPage(adoptSession)

    expect(
      await screen.findByText('این حساب کاربری به پنل مدیریت دسترسی ندارد.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'بازگشت به حساب کاربری' })).toBeTruthy()
    expect(adoptSession).not.toHaveBeenCalled()
  })

  it('skips the exchange when an admin session already exists', async () => {
    const adoptSession = vi.fn()
    renderPage(adoptSession, true)

    expect(await screen.findByText('داشبورد مدیر')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
