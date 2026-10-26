import { useState, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { vi, type Mock } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import type { AuthUser } from '../auth/storage'
import BookingPage from './BookingPage'

/** The single global fetch mock of the suite — adopted by `makeRouter`. */
export const fetchMock = vi.fn()

/** The answer of `POST /auth/otp/verify` the fake API returns. */
export const VERIFY_ANSWER = {
  access_token: 'tok-1',
  token_type: 'bearer',
  expires_in: 2592000,
  user: { id: 'usr-1', name: 'فرهاد کریمی', phone: '09121234099' },
}

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function errorBody(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message, details: null } }, status)
}

/** Lets every pending microtask run (fetch → json → state update). */
export async function flush(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const SERVICES = [
  {
    id: 'haircut',
    label: 'کوتاهی مو',
    description: '',
    price: 400_000,
    duration_minutes: 45,
    includes: [],
    images: [],
    featured: false,
  },
  {
    id: 'beard',
    label: 'اصلاح ریش',
    description: '',
    price: 250_000,
    duration_minutes: 30,
    includes: [],
    images: [],
    featured: false,
  },
]

const DAY = {
  date: '2027-05-10',
  closed: false,
  available: true,
  slots: [
    { time: '10:30', available: true },
    { time: '11:00', available: false },
  ],
}

const BOOKING = {
  code: '100200',
  status: 'pending',
  service: { id: 'haircut', label: 'کوتاهی مو', price: 400_000 },
  date: '2027-05-10',
  time: '10:30',
  name: 'فرهاد کریمی',
  phone: '09121234099',
}

const OTP_REQUEST = { expires_in: 120, resend_after: 60, is_new_user: true, dev_code: '654321' }

/** A small routing API. `bookingFailures` = how many POST /bookings fail with slot_taken first. */
export function makeRouter(options: { bookingFailures: number }) {
  const seen = { availability: 0, otpRequests: 0, otpVerifies: 0, bookings: 0 }
  let failed = 0
  const fetcher = (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href
    if (url.includes('/services')) return Promise.resolve(jsonResponse(SERVICES))
    if (url.includes('/availability')) {
      seen.availability += 1
      return Promise.resolve(jsonResponse({ days: [DAY] }))
    }
    if (url.includes('/auth/otp/request')) {
      seen.otpRequests += 1
      return Promise.resolve(jsonResponse(OTP_REQUEST))
    }
    if (url.includes('/auth/otp/verify')) {
      seen.otpVerifies += 1
      return Promise.resolve(jsonResponse(VERIFY_ANSWER))
    }
    if (url.includes('/bookings')) {
      seen.bookings += 1
      if (failed < options.bookingFailures) {
        failed += 1
        return Promise.resolve(
          errorBody('slot_taken', 'این ساعت پیش‌تر رزرو شده؛ لطفاً ساعت دیگری را انتخاب کنید.', 409),
        )
      }
      return Promise.resolve(jsonResponse(BOOKING))
    }
    return Promise.reject(new Error(`unexpected request: ${url}`))
  }
  // The router only answers while it is wired as the global fetch.
  fetchMock.mockImplementation(fetcher)
  return { seen }
}

/**
 * Rounded auth context: `login` really swaps the user (like AuthProvider does),
 * so the page continues signed in after a verified code.
 */
export function renderBooking(initialUser: AuthUser | null = null): Mock {
  const loginMock: Mock = vi.fn()
  function Harness({ children }: { children: ReactNode }) {
    const [current, setCurrent] = useState<AuthUser | null>(initialUser)
    loginMock.mockImplementation((_token: string, user: AuthUser) => {
      setCurrent(user)
    })
    const value: AuthContextValue = {
      user: current,
      token: current ? 'tok-mounted' : null,
      isAuthenticated: current !== null,
      login: loginMock,
      logout: () => {},
      refreshUser: async () => {},
    }
    return (
      <MemoryRouter>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </MemoryRouter>
    )
  }
  render(
    <Harness>
      <BookingPage />
    </Harness>,
  )
  return loginMock
}

export async function pickServiceAndSlot() {
  await flush() // the days (with their slots) load by fetch; services are static fallback
  // The first match is the radio label; the summary entries come afterwards.
  fireEvent.click(screen.getAllByText('کوتاهی مو')[0])
  await flush()
  fireEvent.click(screen.getByText('۱۰:۳۰'))
}

/** The per-test environment of the booking flow (localStorage, fetch, scroll, RTL). */
export function resetFetchEnvironment() {
  window.localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('scrollTo', vi.fn())
  ;(Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn()
}

export function restoreFetchEnvironment() {
  cleanup()
  vi.unstubAllGlobals()
}
