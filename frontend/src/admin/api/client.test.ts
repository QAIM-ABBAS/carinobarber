import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, buildQuery, setUnauthorizedHandler } from './client'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('apiRequest', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
  })

  it('sends the token as a bearer header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await apiRequest<{ ok: boolean }>('/admin/settings', { token: 'secret-token' })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer secret-token')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('sends no authorization header without a token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await apiRequest<{ ok: boolean }>('/services')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('returns the parsed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total: 3 }))

    await expect(apiRequest<{ total: number }>('/admin/bookings')).resolves.toEqual({ total: 3 })
  })

  it('parses the unified error format', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'slot_taken', message: 'این ساعت قبلاً رزرو شده است.', details: null } },
        409,
      ),
    )

    const error = await apiRequest('/admin/bookings').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(409)
    expect(apiError.code).toBe('slot_taken')
    expect(apiError.message).toBe('این ساعت قبلاً رزرو شده است.')
    expect(apiError.details).toBeNull()
  })

  it('reads the field errors of a validation error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'validation_error',
            message: 'اطلاعات ارسالی معتبر نیست.',
            details: [{ field: 'name', message: 'این فیلد الزامی است.' }],
          },
        },
        422,
      ),
    )

    const error = (await apiRequest('/admin/services').catch((err: unknown) => err)) as ApiError

    expect(error.fieldErrors).toEqual([{ field: 'name', message: 'این فیلد الزامی است.' }])
  })

  it('calls the unauthorized handler on a 401', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'unauthorized', message: 'باید وارد شوید.', details: null } }, 401),
    )

    await expect(apiRequest('/admin/settings', { token: 'old' })).rejects.toBeInstanceOf(ApiError)

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not call the unauthorized handler when it is switched off', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'invalid_credentials', message: 'نام کاربری یا رمز عبور نادرست است.' } },
        401,
      ),
    )

    await expect(
      apiRequest('/admin/login', {
        method: 'POST',
        body: { username: 'admin', password: 'wrong' },
        handleUnauthorized: false,
      }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('turns a network failure into a Persian error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = (await apiRequest('/admin/settings').catch((err: unknown) => err)) as ApiError

    expect(error.status).toBe(0)
    expect(error.code).toBe('network_error')
    expect(error.message).toContain('ارتباط با سرور برقرار نشد')
  })

  it('never leaks the raw body of a broken response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)

    const error = (await apiRequest('/admin/settings').catch((err: unknown) => err)) as ApiError

    expect(error.status).toBe(500)
    expect(error.code).toBe('error')
    expect(error.message).toBeTruthy()
  })
})

describe('buildQuery', () => {
  it('skips the empty values', () => {
    expect(buildQuery({ date: '2026-10-22', q: '', page: 2, status: undefined })).toBe(
      '?date=2026-10-22&page=2',
    )
  })

  it('returns an empty string when nothing is set', () => {
    expect(buildQuery({ date: undefined })).toBe('')
  })
})
