import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getMe, setUnauthorizedHandler } from '../lib/api'
import { AuthContext, type AuthContextValue } from './AuthContext'
import {
  clearSession,
  isExpired,
  readSession,
  updateUser,
  writeSession,
  type AuthUser,
  type StoredSession,
} from './storage'

/** How often the provider re-checks the token expiry while the tab is open. */
const EXPIRY_CHECK_MS = 30_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readSession())
  const [now, setNow] = useState(() => Date.now())

  const login = useCallback((token: string, user: AuthUser, expiresInSeconds: number) => {
    setSession(writeSession(token, user, expiresInSeconds))
    setNow(Date.now())
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  // The API client attaches the token to every call and answers 401 by calling
  // this handler — an expired or rejected token logs the customer out at once.
  useEffect(() => {
    setUnauthorizedHandler(() => logout())
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // The token may expire while the tab stays open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), EXPIRY_CHECK_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (session && isExpired(session, now)) logout()
  }, [session, now, logout])

  /** Reload the profile from the server and keep the storage in sync. */
  const refreshUser = useCallback(async () => {
    const me = await getMe()
    setSession((current) => {
      if (!current) return current
      const user: AuthUser = {
        id: me.id,
        name: me.name,
        phone: me.phone,
        is_admin: me.is_admin === true,
      }
      updateUser(user)
      return { ...current, user }
    })
  }, [])

  // Sync a session restored from storage once, so the admin flag (and the name)
  // are current even for a session that was stored before this feature existed.
  const restoredSession = useRef(session !== null)
  const profileSynced = useRef(false)
  useEffect(() => {
    if (!restoredSession.current || profileSynced.current) return
    profileSynced.current = true
    refreshUser().catch(() => {
      // A network error keeps the stored session; a 401 already logged us out.
    })
  }, [refreshUser])

  const isAuthenticated = session !== null && !isExpired(session, now)

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated,
      login,
      logout,
      refreshUser,
    }),
    [session, isAuthenticated, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
