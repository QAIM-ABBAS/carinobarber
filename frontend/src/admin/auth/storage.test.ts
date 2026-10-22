import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, isExpired, readSession, writeSession } from './storage'

const NOW = 1_700_000_000_000

describe('the admin session', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('stores the token and its expiry', () => {
    const session = writeSession('token-123', 3600, NOW)

    expect(session.token).toBe('token-123')
    expect(session.expiresAt).toBe(NOW + 3_600_000)
    expect(readSession(NOW)?.token).toBe('token-123')
  })

  it('forgets the session', () => {
    writeSession('token-123', 3600, NOW)
    clearSession()

    expect(readSession(NOW)).toBeNull()
  })

  it('drops an expired session', () => {
    writeSession('token-123', 60, NOW)

    expect(readSession(NOW + 61_000)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('keeps a session that is still valid', () => {
    writeSession('token-123', 60, NOW)

    expect(readSession(NOW + 30_000)?.token).toBe('token-123')
  })

  it('ignores a broken value', () => {
    window.sessionStorage.setItem('gc.admin.session', 'not-json')

    expect(readSession(NOW)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('knows when a session is expired', () => {
    const session = { token: 'token-123', expiresAt: NOW + 1000 }

    expect(isExpired(session, NOW)).toBe(false)
    expect(isExpired(session, NOW + 1000)).toBe(true)
    expect(isExpired(session, NOW + 2000)).toBe(true)
  })
})
