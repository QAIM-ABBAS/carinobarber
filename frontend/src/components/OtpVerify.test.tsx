import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import OtpVerify from './OtpVerify'
import type { OtpRequestResult, OtpVerifyResult } from '../lib/api'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function errorBody(code: string, message: string, details: unknown = null, status = 400) {
  return jsonResponse({ error: { code, message, details } }, status)
}

/** Lets every pending microtask run (fetch → json → state update). */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const REQUESTED: OtpRequestResult = {
  expires_in: 120,
  resend_after: 45,
  is_new_user: false,
  dev_code: '654321',
}

const VERIFIED: OtpVerifyResult = {
  access_token: 'token-1',
  token_type: 'bearer',
  expires_in: 2_592_000,
  user: { id: 'usr-1', name: 'علی رضایی', phone: '09123456789' },
}

const codeInput = () => screen.getByLabelText('کد تأیید ۶ رقمی') as HTMLInputElement

beforeEach(() => {
  window.localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OtpVerify', () => {
  it('shows the phone, the dev box and focuses the code input', () => {
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={() => {}} />)

    expect(screen.getByText(/کد ۶ رقمی به شماره/)).toBeTruthy()
    expect(screen.getByText('۰۹۱۲۳۴۵۶۷۸۹')).toBeTruthy()
    expect(screen.getByText('حالت آزمایشی — پیامک فعال نیست. کد شما:')).toBeTruthy()
    expect(screen.getByText('۶۵۴۳۲۱')).toBeTruthy()
    expect(document.activeElement).toBe(codeInput())
  })

  it('shows no dev box when the request carries no dev_code', () => {
    const { dev_code: _, ...withoutCode } = REQUESTED
    render(
      <OtpVerify phone="09123456789" initial={withoutCode} onVerified={() => {}} onBack={() => {}} />,
    )

    expect(screen.queryByText(/حالت آزمایشی/)).toBeNull()
  })

  it('normalizes Persian digits and verifies automatically at 6 digits', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VERIFIED))
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={() => {}} />)

    fireEvent.change(codeInput(), { target: { value: '۱۲۳۴۵۶' } })
    await flush()

    expect(codeInput().value).toBe('123456')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/auth/otp/verify')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body)).code).toBe('123456')
  })

  it('shows the attempts left after a wrong code', async () => {
    fetchMock.mockResolvedValue(
      errorBody('otp_invalid', 'کد وارد شده درست نیست.', { attempts_left: 4 }),
    )
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={() => {}} />)

    fireEvent.change(codeInput(), { target: { value: '000000' } })
    await flush()

    expect(screen.getByText('کد وارد شده درست نیست. (۴ تلاش باقی مانده)')).toBeTruthy()
    // The code stays (one digit can be fixed) but is not sent again on its own.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(codeInput().value).toBe('000000')
  })

  it('shows the exact server message for an expired code', async () => {
    fetchMock.mockResolvedValue(errorBody('otp_expired', 'کد منقضی شده است؛ کد جدید بگیرید.'))
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={() => {}} />)

    fireEvent.change(codeInput(), { target: { value: '123456' } })
    await flush()

    expect(screen.getByText('کد منقضی شده است؛ کد جدید بگیرید.')).toBeTruthy()
  })

  it('reveals the name field on name_required and resubmits the same code', async () => {
    const { dev_code: _, ...withoutCode } = REQUESTED
    fetchMock
      .mockResolvedValueOnce(errorBody('name_required', 'نام و نام خانوادگی را وارد کنید.', null, 422))
      .mockResolvedValueOnce(jsonResponse(VERIFIED))
    render(
      <OtpVerify phone="09123456789" initial={withoutCode} onVerified={() => {}} onBack={() => {}} />,
    )

    fireEvent.change(codeInput(), { target: { value: '123456' } })
    await flush()

    expect(screen.getByText('نام و نام خانوادگی را وارد کنید.')).toBeTruthy()
    const nameInput = screen.getByLabelText('نام و نام خانوادگی') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'علی رضایی' } })
    fireEvent.click(screen.getByText('تأیید و ورود'))
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [, secondInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    const second = JSON.parse(String(secondInit?.body ?? '{}')) as Record<string, unknown>
    expect(second.code).toBe('123456')
    expect(second.name).toBe('علی رضایی')
  })

  it('shows the name field at once when askName is true', () => {
    const { dev_code: _, ...withoutCode } = REQUESTED
    render(
      <OtpVerify
        phone="09123456789"
        askName
        initial={withoutCode}
        onVerified={() => {}}
        onBack={() => {}}
      />,
    )

    expect(screen.getByLabelText('نام و نام خانوادگی')).toBeTruthy()
  })

  it('filling the code from the dev box verifies it automatically', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VERIFIED))
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={() => {}} />)

    fireEvent.click(screen.getByText('پر کردن خودکار'))
    await flush()

    expect(codeInput().value).toBe('654321')
    const [, firstInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(firstInit?.body ?? '{}')).code).toBe('654321')
  })

  it('allows the resend after the cooldown ends', async () => {
    const NEXT: OtpRequestResult = { ...REQUESTED, resend_after: 60, dev_code: '111111' }
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={() => {}} />)
    expect(screen.getByText('ارسال مجدد کد تا ۴۵ ثانیه دیگر')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000)
    })

    expect(screen.queryByText(/ارسال مجدد کد تا/)).toBeNull()
    fetchMock.mockResolvedValue(jsonResponse(NEXT))
    fireEvent.click(screen.getByText('ارسال مجدد'))
    await flush()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/auth/otp/request')
    expect(init.method).toBe('POST')
    expect(screen.getByText('۱۱۱۱۱۱')).toBeTruthy()
    expect(screen.getByText('ارسال مجدد کد تا ۶۰ ثانیه دیگر')).toBeTruthy()
  })

  it('shows the retry time of a rate limited resend and restarts the cooldown', async () => {
    fetchMock.mockResolvedValue(
      errorBody(
        'otp_rate_limited',
        'درخواست کد بیش از حد مجاز است؛ لطفاً کمی صبر کنید و دوباره تلاش کنید.',
        { retry_after: 30 },
        429,
      ),
    )
    render(
      <OtpVerify
        phone="09123456789"
        initial={{ ...REQUESTED, resend_after: 0 }}
        onVerified={() => {}}
        onBack={() => {}}
      />,
    )

    fireEvent.click(screen.getByText('ارسال مجدد'))
    await flush()

    expect(
      screen.getByText('درخواست کد بیش از حد مجاز است؛ لطفاً کمی صبر کنید و دوباره تلاش کنید.'),
    ).toBeTruthy()
    expect(screen.queryByText('ارسال مجدد')).toBeNull()
    expect(screen.getByText('ارسال مجدد کد تا ۳۰ ثانیه دیگر')).toBeTruthy()
  })

  it('goes back to the phone step', () => {
    const onBack = vi.fn()
    render(<OtpVerify phone="09123456789" initial={REQUESTED} onVerified={() => {}} onBack={onBack} />)

    fireEvent.click(screen.getByText('ویرایش شماره'))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
