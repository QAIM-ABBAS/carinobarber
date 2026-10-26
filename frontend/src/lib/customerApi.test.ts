import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  getMe,
  requestOtp,
  setUnauthorizedHandler,
  updateMe,
  verifyOtp,
} from './api'
import { CUSTOMER_STORAGE_KEY, writeSession } from '../auth/storage'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const USER = { id: 'usr-1', name: 'علی رضایی', phone: '09123456789' }

beforeEach(() => {
  window.localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

describe('the public API client with a customer session', () => {
  it('sends the stored customer token as a bearer header', async () => {
    writeSession('token-co', USER, 3600)
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'usr-1', name: 'علی رضایی', phone: '09123456789' }),
    )

    await getMe()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-co')
  })

  it('sends no authorization header without a session', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))

    await getMe().catch(() => undefined)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('clears the session and calls the 401 handler', async () => {
    writeSession('token-co', USER, 3600)
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'unauthorized', message: 'نشست شما منقضی شده است.', details: null } },
        401,
      ),
    )

    const error = await getMe().catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect((error as ApiError).code).toBe('unauthorized')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('does not touch the session on other errors (409)', async () => {
    writeSession('token-co', USER, 3600)
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'slot_taken', message: 'این ساعت قبلاً رزرو شده است.', details: null } },
        409,
      ),
    )

    const error = await getMe().catch((err: unknown) => err)

    expect((error as ApiError).status).toBe(409)
    expect(handler).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeTruthy()
  })

  it('requests an OTP with the normalized phone', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ expires_in: 120, resend_after: 60, is_new_user: true, dev_code: '123456' }),
    )

    const answer = await requestOtp('09123456789')

    expect(answer.dev_code).toBe('123456')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/auth/otp/request')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ phone: '09123456789' })
  })

  it('verifies the OTP with phone, plain code and optional name', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: 'token-1', token_type: 'bearer', expires_in: 2_592_000, user: USER }),
    )

    const answer = await verifyOtp({ phone: '09123456789', code: '123456', name: 'علی رضایی' })

    expect(answer.access_token).toBe('token-1')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/auth/otp/verify')
    expect(JSON.parse(String(init.body))).toEqual({
      phone: '09123456789',
      code: '123456',
      name: 'علی رضایی',
    })
  })

  it('normalizes a numeric user id of the verify answer to a string', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        access_token: 'token-1',
        token_type: 'bearer',
        expires_in: 2_592_000,
        user: { id: 7, name: 'علی رضایی', phone: '09123456789' },
      }),
    )

    const answer = await verifyOtp({ phone: '09123456789', code: '123456' })

    expect(answer.user.id).toBe('7')
    expect(answer.user.name).toBe('علی رضایی')
    expect(answer.user.phone).toBe('09123456789')
  })

  it('normalizes a numeric id of GET /me and PATCH /me as well', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 9, name: 'مریم صادقی', phone: '09120000000' }))
    expect((await getMe()).id).toBe('9')
    fetchMock.mockResolvedValue(jsonResponse({ id: 9, name: 'نام تازه', phone: '09120000000' }))
    expect((await updateMe('نام تازه')).id).toBe('9')
  })
})
