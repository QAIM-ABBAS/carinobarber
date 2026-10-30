import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EyeIcon, EyeOffIcon } from '../layout/icons'
import Button from '../components/Button'
import Field from '../components/Field'

interface LoginState {
  from?: string
}

const FALLBACK_FROM = '/admin'

/** The login page of the admin panel. */
export default function LoginPage() {
  const { login, isAuthenticated, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LoginState | null) ?? null

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(notice)

  const from = state?.from ?? FALLBACK_FROM

  // The message of the expired session is shown once.
  useEffect(() => {
    if (!notice) return
    setMessage(notice)
    clearNotice()
  }, [notice, clearNotice])

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE)
      setSubmitting(false)
    }
  }

  return (
    <div className="ad-login">
      <form className="ad-login__card" onSubmit={onSubmit} noValidate>
        <div className="ad-login__brand">
          <span className="ad-logo" aria-hidden="true">
            <img
              src="/logo/Carino%20Barber%20Monochrome%20Crest.png"
              alt=""
              width={40}
              height={40}
            />
          </span>
          <h1 className="ad-login__title">ورود به پنل مدیریت</h1>
          <p className="ad-login__lead">برای مدیریت نوبت‌ها، خدمات و تنظیمات باشگاه وارد شوید.</p>
        </div>

        {message && (
          <p className="ad-alert" role="status">
            {message}
          </p>
        )}

        <Field label="نام کاربری" htmlFor="login-username">
          <input
            id="login-username"
            className="ad-input"
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </Field>

        <Field label="رمز عبور" htmlFor="login-password">
          <div className="ad-password">
            <input
              id="login-password"
              className="ad-input ad-input--password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="ad-password__toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        {error && (
          <p className="ad-alert ad-alert--error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="ad-login__submit" loading={submitting}>
          {submitting ? 'در حال ورود…' : 'ورود'}
        </Button>
      </form>
    </div>
  )
}
