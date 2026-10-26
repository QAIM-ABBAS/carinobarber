import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CUSTOMER_STORAGE_KEY,
  clearSession,
  isExpired,
  readSession,
  writeSession,
} from './storage'

const NOW = 1_700_000_000_000
const USER = { id: 'usr-1', name: 'علی رضایی', phone: '09123456789' }

beforeEach(() => {
  window.localStorage.clear()
})

describe('the customer session', () => {
  it('stores the token, the user and the expiry', () => {
    const session = writeSession('token-123', USER, 3600, NOW)

    expect(session.token).toBe('token-123')
    expect(session.expiresAt).toBe(NOW + 3_600_000)
    expect(session.user).toEqual(USER)
    expect(readSession(NOW)?.token).toBe('token-123')
    expect(readSession(NOW)?.user).toEqual(USER)
  })

  it('keeps a session that is still valid and drops an expired one', () => {
    writeSession('token-123', USER, 60, NOW)

    expect(readSession(NOW + 30_000)?.token).toBe('token-123')
    expect(readSession(NOW + 61_000)).toBeNull()
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('forgets the session on clearSession', () => {
    writeSession('token-123', USER, 3600, NOW)

    clearSession()

    expect(readSession(NOW)).toBeNull()
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('removes a corrupted value instead of throwing', () => {
    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, 'not-json')

    expect(readSession(NOW)).toBeNull()
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('removes an incomplete value (token without the user)', () => {
    window.localStorage.setItem(
      CUSTOMER_STORAGE_KEY,
      JSON.stringify({ token: 'token-123', expiresAt: NOW + 60_000 }),
    )

    expect(readSession(NOW)).toBeNull()
    expect(window.localStorage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('stays logged out when the storage throws on read', () => {
    writeSession('token-123', USER, 3600, NOW)
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError')
      })

    let result: unknown
    expect(() => {
      result = readSession(NOW)
    }).not.toThrow()
    expect(result).toBeNull()

    spy.mockRestore()
  })

  it('keeps the session in memory when the storage throws on write', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError')
      })

    let session: unknown
    expect(() => {
      session = writeSession('token-123', USER, 3600, NOW)
    }).not.toThrow()
    expect((session as { token: string }).token).toBe('token-123')

    spy.mockRestore()
  })

  it('knows when a session is expired', () => {
    const session = { token: 'token-123', expiresAt: NOW + 1000, user: USER }

    expect(isExpired(session, NOW)).toBe(false)
    expect(isExpired(session, NOW + 1000)).toBe(true)
    expect(isExpired(session, NOW + 2000)).toBe(true)
  })
})
