import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import BookingsSection from './BookingsSection'
import type { MyBooking } from '../lib/api'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
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
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const UPCOMING: MyBooking = {
  code: '123456',
  status: 'pending',
  service: { id: 'haircut', label: 'کوتاهی مو' },
  date: '2026-03-21',
  time: '10:30',
  name: 'علی رضایی',
  price_at_booking: 400_000,
  can_cancel: true,
  created_at: '2026-03-14T10:00:00',
}

const PAST: MyBooking = {
  ...UPCOMING,
  code: '654321',
  status: 'completed',
  service: { id: 'beard', label: 'اصلاح ریش' },
  date: '2026-03-01',
  time: '12:00',
  price_at_booking: 250_000,
  can_cancel: false,
}

/** A tiny in-memory routing backend (the state changes after a successful cancel). */
function makeRouter(options: { cancelStatus: number; pastFailsFirstTime: boolean }) {
  let cancelled = false
  let pastFailed = false
  return (input: string | URL | Request): Response | Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href
    if (url.includes('/me/bookings?scope=upcoming')) {
      return Promise.resolve(jsonResponse(cancelled ? [] : [UPCOMING]))
    }
    if (url.includes('/me/bookings?scope=past')) {
      if (options.pastFailsFirstTime && !pastFailed) {
        pastFailed = true
        return Promise.resolve(errorBody('server_error', 'خطای سرور.', 500))
      }
      return Promise.resolve(jsonResponse([PAST]))
    }
    if (url.includes('/me/bookings/123456/cancel')) {
      const status = options.cancelStatus
      if (status === 200) cancelled = true
      return Promise.resolve(
        status === 200
          ? jsonResponse({ ...UPCOMING, status: 'cancelled', can_cancel: false })
          : errorBody('cancel_not_allowed', 'لغو این نوبت ممکن نیست.', status),
      )
    }
    throw new Error(`unexpected request: ${url}`)
  }
}

/** The section needs a router because the empty state links to /book. */
function renderSection() {
  return render(
    <MemoryRouter>
      <BookingsSection />
    </MemoryRouter>,
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

describe('BookingsSection', () => {
  it('shows both lists with status labels, prices and codes', async () => {
    fetchMock.mockImplementation(makeRouter({ cancelStatus: 200, pastFailsFirstTime: false }))
    renderSection()
    await flush()

    // The visible tab panel is «نوبت‌های پیش‌رو»; the hidden one is skipped by getByRole.
    const upcoming = within(screen.getByRole('tabpanel', { name: 'نوبت‌های پیش‌رو' }))
    expect(upcoming.getByText('کوتاهی مو')).toBeTruthy()
    expect(upcoming.getByText('در انتظار تأیید')).toBeTruthy()
    expect(upcoming.getByText('۴۰۰٬۰۰۰')).toBeTruthy()
    expect(upcoming.getByText('تومان')).toBeTruthy()
    expect(upcoming.getByText('۱۲۳۴۵۶')).toBeTruthy()
    expect(upcoming.getByText('لغو نوبت')).toBeTruthy()

    fireEvent.click(screen.getByText('سابقه نوبت‌ها'))
    const past = within(screen.getByRole('tabpanel', { name: 'سابقه نوبت‌ها' }))
    expect(past.getByText('اصلاح ریش')).toBeTruthy()
    expect(past.getByText('انجام شده')).toBeTruthy()
    expect(past.getByText('۲۵۰٬۰۰۰')).toBeTruthy()
    // «سابقه نوبت‌ها» is never cancellable.
    expect(past.queryByText('لغو نوبت')).toBeNull()
  })

  it('a cancel asks for confirmation, then refreshes both lists with a notice', async () => {
    fetchMock.mockImplementation(makeRouter({ cancelStatus: 200, pastFailsFirstTime: false }))
    renderSection()
    await flush()

    fireEvent.click(screen.getByText('لغو نوبت'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/قابل بازگشت نیست/)).toBeTruthy()

    fireEvent.click(screen.getByText('بله، لغو شود'))
    await flush()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('نوبت «کوتاهی مو» لغو شد.')).toBeTruthy()
    // POST + a fresh GET of both scopes after the success.
    const posts = fetchMock.mock.calls.filter(([url]) => String(url).includes('/cancel'))
    expect(posts).toHaveLength(1)
    const gets = fetchMock.mock.calls.filter(([url]) => String(url).includes('scope='))
    expect(gets).toHaveLength(4)
    // The cancelled booking left «نوبت‌های پیش‌رو» (its empty state links to /book).
    const upcoming = within(screen.getByRole('tabpanel', { name: 'نوبت‌های پیش‌رو' }))
    expect(upcoming.queryByText('کوتاهی مو')).toBeNull()
    expect(upcoming.getByText('نوبت پیش‌رویی ندارید.')).toBeTruthy()
  })

  it('a refused cancel (409) shows the server message and refetches', async () => {
    fetchMock.mockImplementation(makeRouter({ cancelStatus: 409, pastFailsFirstTime: false }))
    renderSection()
    await flush()

    fireEvent.click(screen.getByText('لغو نوبت'))
    fireEvent.click(screen.getByText('بله، لغو شود'))
    await flush()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('لغو این نوبت ممکن نیست.')).toBeTruthy()
    // The booking is still there (the refresh kept the previous list).
    const upcoming = within(screen.getByRole('tabpanel', { name: 'نوبت‌های پیش‌رو' }))
    expect(upcoming.getByText('کوتاهی مو')).toBeTruthy()
  })

  it('an error state offers a retry', async () => {
    fetchMock.mockImplementation(makeRouter({ cancelStatus: 200, pastFailsFirstTime: true }))
    renderSection()
    await flush()

    expect(screen.getByText('خطای سرور.')).toBeTruthy()
    const seen = fetchMock.mock.calls.length

    fireEvent.click(screen.getByText('تلاش دوباره'))
    await flush()

    expect(fetchMock.mock.calls.length).toBeGreaterThan(seen)
    // Open the history tab and confirm the retried list is there.
    fireEvent.click(screen.getByText('سابقه نوبت‌ها'))
    const past = within(screen.getByRole('tabpanel', { name: 'سابقه نوبت‌ها' }))
    expect(past.getByText('اصلاح ریش')).toBeTruthy()
  })
})
