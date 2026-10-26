import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { otpErrorText } from './otpErrorText'

const apiError = (code: string, message: string, details: unknown = null) =>
  new ApiError(400, code, message, details)

describe('otpErrorText', () => {
  it('wrong code — shows the attempts left in Persian digits', () => {
    expect(otpErrorText(apiError('otp_invalid', 'کد تأیید نادرست است.', { attempts_left: 4 })))
      .toEqual({ message: 'کد تأیید نادرست است. (۴ تلاش باقی مانده)' })
  })

  it('wrong code without details — shows the bare server message', () => {
    expect(otpErrorText(apiError('otp_invalid', 'کد تأیید نادرست است.')))
      .toEqual({ message: 'کد تأیید نادرست است.' })
  })

  it('name_required — asks for the name (the code stays valid)', () => {
    expect(otpErrorText(apiError('name_required', 'نام و نام خانوادگی را وارد کنید.'))).toEqual({
      message: 'نام و نام خانوادگی را وارد کنید.',
      askName: true,
    })
  })

  it('rate limit — restarts the resend countdown with retry_after', () => {
    expect(otpErrorText(apiError('otp_rate_limited', 'برای درخواست جدید شکیبا باشید.', { retry_after: 45 })))
      .toEqual({ message: 'برای درخواست جدید شکیبا باشید.', retryAfter: 45 })
  })

  it('rate limit without a positive retry_after — no cooldown change', () => {
    expect(otpErrorText(apiError('otp_rate_limited', 'برای درخواست جدید شکیبا باشید.', { retry_after: 0 })))
      .toEqual({ message: 'برای درخواست جدید شکیبا باشید.' })
  })

  it('every other code passes the server message through unchanged', () => {
    expect(otpErrorText(apiError('otp_expired', 'code dead'))).toEqual({ message: 'code dead' })
    expect(otpErrorText(apiError('otp_too_many_attempts', 'کد منقضی شد'))).toEqual({
      message: 'کد منقضی شد',
    })
  })

  it('a non-ApiError failure falls back to the generic message', () => {
    expect(otpErrorText(new TypeError('Failed to fetch'))).toEqual({
      message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
    })
  })
})
