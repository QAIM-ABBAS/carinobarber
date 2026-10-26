/**
 * The customer session lives in `localStorage` under `gc_customer`: the customer
 * logs in once with an OTP and stays logged in across visits (unlike the admin
 * panel, whose session ends with the tab). Every access is wrapped in try/catch
 * because `localStorage` is not always available (private mode, embedded
 * webviews, disabled storage) and the stored JSON can be corrupted.
 */

/** What the API knows about the customer (his bookings are separate). */
export interface AuthUser {
  id: string
  name: string
  phone: string
}

export interface StoredSession {
  token: string
  /** Epoch milliseconds. */
  expiresAt: number
  user: AuthUser
}

export const CUSTOMER_STORAGE_KEY = 'gc_customer'

/** `localStorage` is not available in every environment (private mode, SSR). */
function safeStorage(): Storage | null {
  try {
    const store = window.localStorage
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

/** The stored user must carry all three fields; anything else is a broken value. */
function parseUser(value: unknown): AuthUser | null {
  if (typeof value !== 'object' || value === null) return null
  const user = value as Partial<AuthUser>
  if (typeof user.id !== 'string' || !user.id) return null
  if (typeof user.name !== 'string') return null
  if (typeof user.phone !== 'string' || !user.phone) return null
  return { id: user.id, name: user.name, phone: user.phone }
}

/** Read the stored session. An expired, broken or incomplete value is removed. */
export function readSession(now: number = Date.now()): StoredSession | null {
  try {
    const store = safeStorage()
    if (!store) return null
    const raw = store.getItem(CUSTOMER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    const user = parseUser(parsed.user)
    const invalid =
      typeof parsed.token !== 'string' ||
      !parsed.token ||
      typeof parsed.expiresAt !== 'number' ||
      user === null
    if (invalid) {
      store.removeItem(CUSTOMER_STORAGE_KEY)
      return null
    }
    const session: StoredSession = { token: parsed.token as string, expiresAt: parsed.expiresAt as number, user: user as AuthUser }
    if (isExpired(session, now)) {
      store.removeItem(CUSTOMER_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    // Corrupted JSON or a storage that threw — forget the value and stay logged out.
    try {
      window.localStorage.removeItem(CUSTOMER_STORAGE_KEY)
    } catch {
      // A dead storage cannot be cleared either; nothing else to do.
    }
    return null
  }
}

/** Store a new session and return it (kept in memory even if the storage fails). */
export function writeSession(
  token: string,
  user: AuthUser,
  expiresInSeconds: number,
  now: number = Date.now(),
): StoredSession {
  const session: StoredSession = { token, expiresAt: now + expiresInSeconds * 1000, user }
  try {
    safeStorage()?.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // The storage may fill up or vanish mid-write; the session stays memory-only.
  }
  return session
}

/** Replace the stored user (for example after a successful `PATCH /me`). */
export function updateUser(user: AuthUser): void {
  try {
    const store = safeStorage()
    if (!store) return
    const raw = store.getItem(CUSTOMER_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') return
    const session: StoredSession = { token: parsed.token, expiresAt: parsed.expiresAt, user }
    store.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // The storage or the stored JSON is broken — the provider keeps the memory copy.
  }
}

/** Forget the stored session. */
export function clearSession(): void {
  try {
    safeStorage()?.removeItem(CUSTOMER_STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
