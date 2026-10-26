/**
 * The Persian text of an OTP error.
 *
 * The server answers with the unified error envelope (`{error:{code,message,details}}`);
 * this helper turns it into the texts the `OtpVerify` step shows verbatim:
 * the attempts that are left for a wrong code, the retry time of a rate limit and
 * the name request for `name_required` (the code is NOT consumed in that case).
 */

import { ApiError } from './api'
import { toFaDigits } from './booking'

export interface OtpError {
  /** The message for the error box (`aria-live="polite"`). */
  message: string
  /** `details.retry_after` of `otp_rate_limited` — restarts the resend countdown. */
  retryAfter?: number
  /** `name_required` — the caller reveals its name field and resubmits the same code. */
  askName?: boolean
}

const GENERIC_ERROR = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

/** The `details` object of the error envelope (when the server sent one). */
function errorDetails(error: ApiError): Record<string, unknown> | null {
  return error.details && typeof error.details === 'object'
    ? (error.details as Record<string, unknown>)
    : null
}

export function otpErrorText(error: unknown): OtpError {
  if (error instanceof ApiError) {
    const details = errorDetails(error)
    switch (error.code) {
      case 'otp_invalid': {
        const left = details?.attempts_left
        return {
          message:
            typeof left === 'number'
              ? `${error.message} (${toFaDigits(left)} تلاش باقی مانده)`
              : error.message,
        }
      }
      case 'name_required':
        return { message: error.message, askName: true }
      case 'otp_rate_limited': {
        const retry = details?.retry_after
        return {
          message: error.message,
          ...(typeof retry === 'number' && retry > 0 ? { retryAfter: retry } : {}),
        }
      }
      default:
        // otp_expired, otp_too_many_attempts, invalid_phone, …
        return { message: error.message }
    }
  }
  return { message: GENERIC_ERROR }
}
