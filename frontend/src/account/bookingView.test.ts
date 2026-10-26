import { describe, expect, it } from 'vitest'
import { formatBookedAt, statusLabel } from './bookingView'

describe('statusLabel', () => {
  it('maps every known status to its Persian label', () => {
    expect(statusLabel('pending')).toBe('در انتظار تأیید')
    expect(statusLabel('confirmed')).toBe('تأیید شده')
    expect(statusLabel('completed')).toBe('انجام شده')
    expect(statusLabel('cancelled')).toBe('لغو شده')
    expect(statusLabel('no_show')).toBe('عدم حضور')
  })

  it('falls back to the raw status when it is unknown', () => {
    expect(statusLabel('something_new')).toBe('something_new')
  })
})

describe('formatBookedAt', () => {
  it('formats the Jalali date (Persian digits) and the time', () => {
    const text = formatBookedAt('2026-03-21', '09:30')

    expect(text).toContain('ساعت ۰۹:۳۰')
    // The date part is Jalali with Persian digits (weekday + day + month).
    expect(text).toMatch(/[\u06F0-\u06F9]/)
    expect(text).toContain('، ')
  })

  it('parses the ISO date as a local date (no UTC shift)', () => {
    // 2026-01-01 is always the same local weekday — a UTC shift would change it.
    const newYear = formatBookedAt('2026-01-01', '23:59')
    expect(newYear).toContain('ساعت ۲۳:۵۹')
  })
})
