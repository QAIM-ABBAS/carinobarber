import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { readSession } from '../../auth/storage'
import { ApiError, GENERIC_ERROR_MESSAGE, apiRequest } from '../api/client'
import type { LoginResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'

const ADMIN_HOME = '/admin'
const LOGIN_PATH = '/admin/login'

/** The message of a failed exchange; the server text is used when it is not a known case. */
function messageOf(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC_ERROR_MESSAGE
  if (error.status === 403) return 'این حساب کاربری به پنل مدیریت دسترسی ندارد.'
  if (error.status === 401) return 'نشست حساب کاربری شما معتبر نیست؛ دوباره وارد شوید.'
  return error.message
}

/**
 * The passwordless entry into the admin panel.
 *
 * The page is outside `RequireAuth` on purpose: it reads the customer session,
 * asks the API to exchange it for an admin token (the server compares the phone
 * with `ADMIN_PHONE`), stores that token and redirects to the dashboard. Opening
 * `/admin` directly still goes through the normal login page.
 */
export default function AdminSsoPage() {
  const { adoptSession, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // An admin who is already signed in does not need another exchange.
    if (isAuthenticated) {
      navigate(ADMIN_HOME, { replace: true })
      return
    }
    if (started.current) return
    started.current = true

    const customer = readSession()
    if (!customer) {
      navigate(LOGIN_PATH, { replace: true, state: { from: ADMIN_HOME } })
      return
    }

    let cancelled = false
    apiRequest<LoginResponse>('/admin/session', {
      method: 'POST',
      token: customer.token,
      // A rejected customer token must not run the admin logout path.
      handleUnauthorized: false,
    })
      .then((answer) => {
        if (cancelled) return
        adoptSession(answer.access_token, answer.expires_in)
        navigate(ADMIN_HOME, { replace: true })
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setChecking(false)
        setError(messageOf(reason))
      })

    return () => {
      cancelled = true
      // React StrictMode remounts effects in development; allow the second run.
      started.current = false
    }
  }, [adoptSession, isAuthenticated, navigate])

  return (
    <div className="ad-login">
      <div className="ad-login__card" aria-busy={checking || undefined}>
        <div className="ad-login__brand">
          <span className="ad-logo" aria-hidden="true">
            <img
              src="/logo/logo.jpg"
              alt=""
              width={40}
              height={40}
            />
          </span>
          <h1 className="ad-login__title">ورود به پنل مدیریت</h1>
          {checking && !error && (
            <p className="ad-login__lead" role="status">
              در حال بررسی حساب کاربری و دسترسی مدیریت…
            </p>
          )}
          {!checking && !error && (
            <p className="ad-login__lead" role="status">
              در حال انتقال به داشبورد…
            </p>
          )}
        </div>

        {error && (
          <>
            <p className="ad-alert ad-alert--error" role="alert">
              {error}
            </p>
            <Link className="ad-btn ad-btn--secondary" to="/account">
              بازگشت به حساب کاربری
            </Link>
            <Link className="ad-btn ad-btn--ghost" to={LOGIN_PATH}>
              ورود با نام کاربری و رمز عبور
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
