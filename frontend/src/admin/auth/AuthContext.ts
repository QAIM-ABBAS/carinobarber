import { createContext, useContext } from 'react'

/** The state of the admin session. */
export interface AuthContextValue {
  /** The bearer token (null when the admin is not logged in). */
  token: string | null
  isAuthenticated: boolean
  /** Exchange the credentials for a token and store it. */
  login: (username: string, password: string) => Promise<void>
  /** Forget the session, clear the cache and go back to the login page. */
  logout: (message?: string) => void
  /** A message for the login page (the session expired, …). */
  notice: string | null
  /** Forget the message of the login page. */
  clearNotice: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** The state of the admin session. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
