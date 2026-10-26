import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, requestOtp, type OtpRequestResult, type OtpVerifyResult } from '../lib/api'
import { normalizePhone } from '../lib/booking'
import OtpVerify from '../components/OtpVerify'

const PHONE_INVALID = 'شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).'

/** The `from` path of `location.state` — internal paths only. */
function readFrom(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const from = (state as { from?: unknown }).from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
}

/**
 * The login card of the «حساب» page: step 1 asks for the phone, step 2 verifies
 * the code. A phone without an account becomes a registration (it heeds
 * `is_new_user` of the request answer and asks for the name).
 */
export default function LoginCard() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [requested, setRequested] = useState<OtpRequestResult | null>(null)

  const from = readFrom(location.state)
  const normalized = normalizePhone(phone)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!normalized) {
      setError(PHONE_INVALID)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const answer = await requestOtp(normalized)
      setRequested(answer)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطایی رخ داد. لطفاً دوباره تلاش کنید.')
    } finally {
      setBusy(false)
    }
  }

  /** Login succeeded — store the session and go back where the user came from. */
  const onVerified = (result: OtpVerifyResult) => {
    login(result.access_token, result.user, result.expires_in)
    if (from) navigate(from, { replace: true })
  }

  if (requested && normalized) {
    return (
      <div className="ac-card">
        <OtpVerify
          phone={normalized}
          askName={requested.is_new_user}
          initial={requested}
          onVerified={onVerified}
          onBack={() => {
            setRequested(null)
            setError(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="ac-card">
      <h2 className="ac-card__title">ورود یا ثبت‌نام</h2>
      <p className="ac-card__lead">
        شماره موبایلتان را وارد کنید؛ یک کد ۶ رقمی برایتان ارسال می‌شود. حساب جدید برایتان ساخته
        می‌شود اگر از قبل نداشته باشید.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <div className="ac-field">
          <label htmlFor="ac-login-phone">شماره موبایل</label>
          <input
            id="ac-login-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'ac-login-error' : undefined}
          />
          {error && (
            <p className="ac-err" id="ac-login-error" aria-live="polite">
              {error}
            </p>
          )}
        </div>

        <button type="submit" className="ac-btn ac-btn--block" disabled={busy}>
          {busy && <span className="ac-spinner" aria-hidden="true" />}
          {busy ? 'در حال ارسال کد…' : 'دریافت کد'}
        </button>
      </form>
    </div>
  )
}
