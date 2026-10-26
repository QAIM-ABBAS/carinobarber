import { createContext, useContext } from 'react'
import type { AuthUser } from './storage'

/** The customer session state of the public app. */
export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  /** Store the session after a successful `verifyOtp`. */
  login: (token: string, user: AuthUser, expiresInSeconds: number) => void
  /** Forget the session (also runs when the API answers 401). */
  logout: () => void
  /** Reload the profile from `GET /me` (after a `PATCH /me`). */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
AuthContext.displayName = 'CustomerAuth'

/** Access to the customer session state (throws outside the `AuthProvider`). */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
