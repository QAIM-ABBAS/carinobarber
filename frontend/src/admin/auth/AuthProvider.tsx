import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiRequest, setUnauthorizedHandler } from '../api/client'
import type { LoginResponse } from '../api/types'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { clearSession, isExpired, readSession, writeSession, type StoredSession } from './storage'

/** The message the login page shows when the session expired. */
export const SESSION_EXPIRED_MESSAGE = 'نشست شما منقضی شد، دوباره وارد شوید.'

/** How often the provider checks whether the token is still valid. */
const EXPIRY_CHECK_MS = 30_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readSession())
  const [now, setNow] = useState(() => Date.now())
  const [notice, setNotice] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logout = useCallback(
    (message?: string) => {
      clearSession()
      setSession(null)
      queryClient.clear()
      setNotice(message ?? null)
      navigate('/admin/login', { replace: true })
    },
    [navigate, queryClient],
  )

  // The API client calls this handler when the server answers 401.
  useEffect(() => {
    setUnauthorizedHandler(() => logout(SESSION_EXPIRED_MESSAGE))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // The token expires while the tab is open — check it from time to time.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), EXPIRY_CHECK_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (session && isExpired(session, now)) logout(SESSION_EXPIRED_MESSAGE)
  }, [session, now, logout])

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiRequest<LoginResponse>('/admin/login', {
      method: 'POST',
      body: { username, password },
      // A wrong password answers 401 — that must not log anybody out.
      handleUnauthorized: false,
    })
    setSession(writeSession(response.access_token, response.expires_in))
    setNotice(null)
  }, [])

  const adoptSession = useCallback((token: string, expiresInSeconds: number) => {
    setSession(writeSession(token, expiresInSeconds))
    setNow(Date.now())
    setNotice(null)
  }, [])

  const clearNotice = useCallback(() => setNotice(null), [])

  const isAuthenticated = session !== null && !isExpired(session, now)

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      isAuthenticated,
      login,
      adoptSession,
      logout,
      notice,
      clearNotice,
    }),
    [session, isAuthenticated, login, adoptSession, logout, notice, clearNotice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
