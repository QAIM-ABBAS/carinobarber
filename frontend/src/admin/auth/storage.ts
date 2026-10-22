/**
 * The admin session lives in `sessionStorage`: it disappears when the tab is closed.
 * The token is also kept in memory by the `AuthProvider`.
 */

export interface StoredSession {
  /** The bearer token. */
  token: string
  /** The moment the token expires (epoch milliseconds). */
  expiresAt: number
}

const STORAGE_KEY = 'gc.admin.session'

/** `sessionStorage` is not available in every environment (private mode, SSR). */
function safeStorage(): Storage | null {
  try {
    const store = window.sessionStorage
    const probe = '__gc_probe__'
    store.setItem(probe, '1')
    store.removeItem(probe)
    return store
  } catch {
    return null
  }
}

/** True when the session is expired (or expires exactly now). */
export function isExpired(session: StoredSession, now: number = Date.now()): boolean {
  return session.expiresAt <= now
}

/** Read the stored session. An expired or broken value is removed. */
export function readSession(now: number = Date.now()): StoredSession | null {
  const store = safeStorage()
  if (!store) return null
  const raw = store.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') {
      store.removeItem(STORAGE_KEY)
      return null
    }
    const session: StoredSession = { token: parsed.token, expiresAt: parsed.expiresAt }
    if (isExpired(session, now)) {
      store.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    store.removeItem(STORAGE_KEY)
    return null
  }
}

/** Store a new session and return it. */
export function writeSession(
  token: string,
  expiresInSeconds: number,
  now: number = Date.now(),
): StoredSession {
  const session: StoredSession = { token, expiresAt: now + expiresInSeconds * 1000 }
  safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

/** Forget the stored session. */
export function clearSession(): void {
  safeStorage()?.removeItem(STORAGE_KEY)
}
