import { useState, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import type { AuthUser } from '../auth/storage'
import ProfileCard from './ProfileCard'

const fetchMock = vi.fn()

/** Captured from the most recent render (re-created once per test). */
let logoutMock: Mock
let refreshUserMock: Mock

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

/** Lets every pending microtask run (fetch → json → state update). */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const USER: AuthUser = { id: 'usr-1', name: 'علی رضایی', phone: '09123456789' }
const UPDATED: AuthUser = { id: 'usr-1', name: 'نام تازه', phone: '09123456789' }

/**
 * Renders the card inside a router (the footer has a <Link>) and a harness
 * auth context. When `updated` is given, `refreshUser` swaps the user after
 * the next PATCH — exactly what the real AuthProvider does after `GET /me`.
 */
function renderCard(user: AuthUser, updated: AuthUser | null = null) {
  logoutMock = vi.fn()
  refreshUserMock = vi.fn()

  function Harness({ children }: { children: ReactNode }) {
    const [current, setCurrent] = useState(user)
    refreshUserMock.mockImplementation(async () => {
      if (updated) setCurrent(updated)
    })
    const context: AuthContextValue = {
      user: current,
      token: 'token-1',
      isAuthenticated: true,
      login: vi.fn(),
      logout: logoutMock,
      refreshUser: refreshUserMock,
    }
    return (
      <MemoryRouter>
        <AuthContext.Provider value={context}>{children}</AuthContext.Provider>
      </MemoryRouter>
    )
  }

  render(
    <Harness>
      <ProfileCard />
    </Harness>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProfileCard', () => {
  it('shows the name, the Persian phone and the actions', () => {
    renderCard(USER)

    expect(screen.getByText('علی رضایی')).toBeTruthy()
    expect(screen.getByText('۰۹۱۲۳۴۵۶۷۸۹')).toBeTruthy()
    expect(screen.getByText('رزرو نوبت جدید')).toBeTruthy()
    expect(screen.getByText('خروج از حساب')).toBeTruthy()
  })

  it('logs out', () => {
    renderCard(USER)

    fireEvent.click(screen.getByText('خروج از حساب'))

    expect(logoutMock).toHaveBeenCalledTimes(1)
  })

  it('the pencil opens the inline edit and rejects a too-short name', async () => {
    renderCard(USER)

    fireEvent.click(screen.getByLabelText('تغییر نام'))
    const input = screen.getByLabelText('نام') as HTMLInputElement
    expect(input.value).toBe('علی رضایی')

    fireEvent.change(input, { target: { value: 'ع' } })
    fireEvent.click(screen.getByLabelText('ذخیره نام'))
    await flush()

    expect(screen.getByText('نام باید ۲ تا ۱۰۰ حرف باشد.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    // The editor stays open.
    expect(screen.getByLabelText('ذخیره نام')).toBeTruthy()
  })

  it('saving a valid name patches /me and refreshes the session', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...UPDATED }))
    renderCard(USER, UPDATED)

    fireEvent.click(screen.getByLabelText('تغییر نام'))
    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'نام تازه' } })
    fireEvent.click(screen.getByLabelText('ذخیره نام'))
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/me')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ name: 'نام تازه' })
    expect(refreshUserMock).toHaveBeenCalledTimes(1)
    // Back to the display row with the new name and the success note.
    expect(screen.getByText('نام تازه')).toBeTruthy()
    expect(screen.getByText('نام شما ذخیره شد.')).toBeTruthy()
    expect(screen.getByLabelText('تغییر نام')).toBeTruthy()
  })

  it('keeps the editor open when the server rejects the name', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'invalid_name', message: 'نام وارد شده معتبر نیست.', details: null } },
        422,
      ),
    )
    renderCard(USER)

    fireEvent.click(screen.getByLabelText('تغییر نام'))
    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'نام تازه' } })
    fireEvent.click(screen.getByLabelText('ذخیره نام'))
    await flush()

    expect(screen.getByText('نام وارد شده معتبر نیست.')).toBeTruthy()
    expect(screen.getByLabelText('ذخیره نام')).toBeTruthy()
  })

  it('cancel closes the editor without any request', () => {
    renderCard(USER)

    fireEvent.click(screen.getByLabelText('تغییر نام'))
    fireEvent.click(screen.getByLabelText('انصراف از تغییر نام'))

    expect(screen.getByText('علی رضایی')).toBeTruthy()
    expect(screen.getByLabelText('تغییر نام')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
