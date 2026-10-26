import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { requestOtp, verifyOtp, type OtpRequestResult, type OtpVerifyResult } from '../lib/api'
import { toEnDigits, toFaDigits } from '../lib/booking'
import { otpErrorText } from '../lib/otpErrorText'
import OtpDevBox from './OtpDevBox'
import '../account.css'

interface OtpVerifyProps {
  /** The phone that receives the code (normalized `09…`). */
  phone: string
  /** A name the user already entered (sent together with the code). */
  name?: string
  /** True when the first request said that this phone has no account yet. */
  askName?: boolean
  /**
   * The answer of `requestOtp()` that the caller made before showing this
   * component («حساب» page). When omitted the component requests its own code
   * on mount. Resends are always handled here.
   */
  initial?: OtpRequestResult | null
  /** The code was correct — the caller receives the full verify answer. */
  onVerified: (result: OtpVerifyResult) => void
  /** «ویرایش شماره» — back to the phone field. */
  onBack: () => void
}

const CODE_LENGTH = 6
const CODE_LENGTH_ERROR = 'کد ۶ رقمی را وارد کنید.'
const NAME_INVALID_ERROR = 'نام و نام خانوادگی باید ۲ تا ۱۰۰ حرف باشد.'

type Status = 'idle' | 'requesting' | 'verifying' | 'resending'

/**
 * The shared OTP step: enter the 6-digit code, resend it on demand and log in.
 * Used by the «حساب» page and by the booking flow. The dev box (the plain code
 * on screen) appears only when the request answer carries a `dev_code`.
 */
export default function OtpVerify({
  phone,
  name,
  askName = false,
  initial = null,
  onVerified,
  onBack,
}: OtpVerifyProps) {
  const [result, setResult] = useState<OtpRequestResult | null>(initial)
  const [code, setCode] = useState('')
  const [nameValue, setNameValue] = useState('')
  const [showName, setShowName] = useState(askName)
  const [resendIn, setResendIn] = useState(initial ? Math.max(0, initial.resend_after) : 0)
  const [status, setStatus] = useState<Status>(initial ? 'idle' : 'requesting')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastSubmitted = useRef<string | null>(null)

  const handleError = useCallback((err: unknown) => {
    const { message, retryAfter, askName } = otpErrorText(err)
    setError(message)
    if (typeof retryAfter === 'number') setResendIn(retryAfter)
    if (askName) setShowName(true)
  }, [])

  // The caller may present a fresh request answer (a new code) at any time.
  useEffect(() => {
    if (!initial) return
    setResult(initial)
    setResendIn(Math.max(0, initial.resend_after))
    setCode('')
    setShowName(askName || initial.is_new_user)
    setError(null)
    setStatus('idle')
  }, [initial, askName])

  // No answer was passed in — ask for a code on mount.
  useEffect(() => {
    if (initial || result) return
    let cancelled = false
    setStatus('requesting')
    requestOtp(phone)
      .then((res) => {
        if (cancelled) return
        setResult(res)
        setResendIn(Math.max(0, res.resend_after))
        setStatus('idle')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        handleError(err)
        setStatus('idle')
      })
    return () => {
      cancelled = true
    }
  }, [initial, result, phone, handleError])

  // The one-second countdown until «ارسال مجدد» becomes possible again.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setResendIn((seconds) => (seconds > 0 ? seconds - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const submit = useCallback(async () => {
    const digits = toEnDigits(code).replace(/\D/g, '')
    if (digits.length !== CODE_LENGTH) {
      setError(CODE_LENGTH_ERROR)
      return
    }
    const enteredName = nameValue.trim()
    const effectiveName = name?.trim() || (showName ? enteredName : '') || undefined
    if (effectiveName !== undefined && (effectiveName.length < 2 || effectiveName.length > 100)) {
      setError(NAME_INVALID_ERROR)
      return
    }
    setStatus('verifying')
    setError(null)
    try {
      const answer = await verifyOtp({
        phone,
        code: digits,
        ...(effectiveName ? { name: effectiveName } : {}),
      })
      onVerified(answer)
    } catch (err) {
      handleError(err)
    } finally {
      setStatus('idle')
    }
  }, [code, nameValue, name, showName, phone, onVerified, handleError])

  // Six digits typed (or autofilled) → check the code without pressing a button.
  useEffect(() => {
    if (code.length !== CODE_LENGTH || status !== 'idle') return
    if (lastSubmitted.current === code) return
    lastSubmitted.current = code
    void submit()
  }, [code, status, submit])

  const resend = useCallback(async () => {
    setStatus('resending')
    setError(null)
    try {
      const res = await requestOtp(phone)
      setResult(res)
      setResendIn(Math.max(0, res.resend_after))
      setCode('')
      lastSubmitted.current = null
      inputRef.current?.focus()
    } catch (err) {
      handleError(err)
    } finally {
      setStatus('idle')
    }
  }, [phone, handleError])

  const onCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(toEnDigits(event.target.value).replace(/\D/g, '').slice(0, CODE_LENGTH))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  if (!result && status === 'requesting') {
    return (
      <div className="ac-otp" aria-busy="true">
        <p className="ac-muted">در حال ارسال کد…</p>
      </div>
    )
  }

  const devCode = result?.dev_code ?? null
  const busy = status !== 'idle'

  return (
    <form className="ac-otp" onSubmit={onSubmit} noValidate>
      <p className="ac-otp__lead">
        کد ۶ رقمی به شماره <bdi dir="ltr">{toFaDigits(phone)}</bdi> ارسال شد.
      </p>

      {/* DEV BOX — remove together with OTP_DEV_MODE (one condition on dev_code). */}
      {devCode !== null && (
        <OtpDevBox code={devCode} disabled={busy} onFill={() => setCode(devCode)} />
      )}

      {showName && (
        <div className="ac-field">
          <label htmlFor="ac-otp-name">نام و نام خانوادگی</label>
          <input
            id="ac-otp-name"
            type="text"
            autoComplete="name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
          />
        </div>
      )}

      <div className="ac-field ac-field--code">
        <label htmlFor="ac-otp-code">کد تأیید</label>
        <input
          id="ac-otp-code"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          dir="ltr"
          value={code}
          onChange={onCodeChange}
          disabled={busy}
          aria-label="کد تأیید ۶ رقمی"
        />
      </div>

      {error && (
        <p className="ac-err ac-err--box" aria-live="polite">
          {error}
        </p>
      )}

      <button type="submit" className="ac-btn ac-btn--block" disabled={busy}>
        {status === 'verifying' && <span className="ac-spinner" aria-hidden="true" />}
        {status === 'verifying' ? 'در حال بررسی…' : 'تأیید و ورود'}
      </button>

      <div className="ac-otp__links">
        {resendIn > 0 ? (
          <p className="ac-otp__cooldown" aria-hidden="true">
            ارسال مجدد کد تا {toFaDigits(resendIn)} ثانیه دیگر
          </p>
        ) : (
          <button
            type="button"
            className="ac-link"
            onClick={() => void resend()}
            disabled={busy}
          >
            ارسال مجدد
          </button>
        )}
        <button type="button" className="ac-link" onClick={onBack} disabled={busy}>
          ویرایش شماره
        </button>
      </div>
    </form>
  )
}
