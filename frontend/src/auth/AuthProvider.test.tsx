import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { AuthProvider } from './AuthProvider'
import { useAuth, type AuthContextValue } from './AuthContext'
import { CUSTOMER_STORAGE_KEY, writeSession } from './storage'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const USER = { id: 'usr-1', name: 'علی رضایی', phone: '09123456789' }

/** Collects every `useAuth` value the provider has rendered so far. */
const values: AuthContextValue[] = []
function Probe() {
  values.push(useAuth())
  return null
}

/** The value of the last render (the current state). */
function latest(): AuthContextValue {
  return values[values.length - 1]
}

beforeEach(() => {
  window.localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  values.length = 0
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the customer AuthProvider', () => {
  it('starts logged out when nothing is stored', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(latest().isAuthenticated).toBe(false)
    expect(latest().user).toBeNull()
    expect(latest().token).toBeNull()
  })

  it('picks up a stored session on mount', () => {
    const stored = writeSession('token-abc', USER, 3600)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(latest().isAuthenticated).toBe(true)
    expect(latest().user).toEqual(stored.user)
    expect(latest().token).toBe('token-abc')
  })

  it('login stores the token, the user and the expiry', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(() =>
      act(() => {
        latest().login('token-xyz', USER, 7200)
      }),
    ).not.toThrow()

    expect(latest().isAuthenticated).toBe(true)
    expect(latest().user).toEqual(USER)
    expect(latest().token).toBe('token-xyz')
    const raw = JSON.parse(String(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)))
    expect(raw.token).toBe('token-xyz')
    expect(raw.user.phone).toBe(USER.phone)
    expect(raw.expiresAt).toBeGreaterThan(Date.now() + 3_600_000)
  })

  it('logout clears the session', () => {
    writeSession('token-abc', USER, 3600)
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(latest().isAuthenticated).toBe(true)

    expect(() =>
      act(() => {
        latest().logout()
      }),
    ).not.toThrow()

    expect(latest().isAuthenticated).toBe(false)
    expect(latest().user).toBeNull()
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('a 401 answer ends the session and calls the logout path', async () => {
    writeSession('token-abc', USER, 3600)
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'unauthorized', message: 'نشست شما منقضی شده است.', details: null } },
        401,
      ),
    )

    let refreshFailed = false
    await act(async () => {
      await latest().refreshUser().catch(() => {
        refreshFailed = true
      })
    })

    expect(refreshFailed).toBe(true)
    expect(latest().isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('refreshUser reloads the profile and keeps the storage in sync', async () => {
    writeSession('token-abc', USER, 3600)
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'usr-1', name: 'نام تازه', phone: '09123456789', created_at: '2026-01-01' }),
    )

    await act(async () => {
      await latest().refreshUser()
    })

    expect(latest().user?.name).toBe('نام تازه')
    const raw = JSON.parse(String(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)))
    expect(raw.user.name).toBe('نام تازه')
  })
})
