import { describe, expect, it } from 'vitest'
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  WEEKDAYS,
  addDays,
  faDigits,
  formatJalali,
  formatJalaliWeekday,
  formatNumber,
  formatTime,
  formatToman,
  isoToJalali,
  jalaliMonthLength,
  jalaliToISO,
  persianWeekdayIndex,
  todayISO,
  toISODate,
  weekdayLabel,
} from './format'

describe('faDigits', () => {
  it('turns the ASCII digits into Persian digits', () => {
    expect(faDigits('1405')).toBe('۱۴۰۵')
    expect(faDigits(2026)).toBe('۲۰۲۶')
  })

  it('keeps the other characters', () => {
    expect(faDigits('12:00')).toBe('۱۲:۰۰')
    expect(faDigits('abc')).toBe('abc')
  })
})

describe('formatToman', () => {
  it('adds the Persian thousands separator', () => {
    expect(formatToman(400000)).toBe('۴۰۰٬۰۰۰')
    expect(formatToman(1500)).toBe('۱٬۵۰۰')
  })

  it('shows zero without a separator', () => {
    expect(formatToman(0)).toBe('۰')
  })
})

describe('formatNumber', () => {
  it('formats a plain number', () => {
    expect(formatNumber(1234)).toBe('۱٬۲۳۴')
    expect(formatNumber(12)).toBe('۱۲')
  })
})

describe('formatTime', () => {
  it('shows the time with Persian digits', () => {
    expect(formatTime('12:00')).toBe('۱۲:۰۰')
    expect(formatTime('09:30')).toBe('۰۹:۳۰')
  })
})

describe('formatJalali', () => {
  it('shows a Gregorian date in the Jalali calendar', () => {
    // 2026-10-22 is the 30th of Mehr 1405.
    const formatted = formatJalali('2026-10-22')
    expect(formatted).toContain('۱۴۰۵')
    expect(formatted).toContain('مهر')
    expect(formatted).toContain('۳۰')
  })

  it('shows the weekday of a date', () => {
    expect(formatJalaliWeekday('2026-10-22')).toBe('پنجشنبه')
    expect(formatJalaliWeekday('2026-10-19')).toBe('دوشنبه')
  })
})

describe('STATUS_LABELS', () => {
  it('has a Persian label for every status', () => {
    expect(STATUS_LABELS.pending).toBe('در انتظار تأیید')
    expect(STATUS_LABELS.confirmed).toBe('تأیید شده')
    expect(STATUS_LABELS.completed).toBe('انجام شده')
    expect(STATUS_LABELS.cancelled).toBe('لغو شده')
    expect(STATUS_LABELS.no_show).toBe('عدم حضور')
  })
})

describe('ALLOWED_TRANSITIONS', () => {
  it('mirrors the transitions of the API', () => {
    expect(ALLOWED_TRANSITIONS.pending).toEqual(['confirmed', 'cancelled', 'no_show'])
    expect(ALLOWED_TRANSITIONS.confirmed).toEqual(['completed', 'cancelled', 'no_show'])
    expect(ALLOWED_TRANSITIONS.completed).toEqual([])
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([])
    expect(ALLOWED_TRANSITIONS.no_show).toEqual([])
  })
})

describe('WEEKDAYS', () => {
  it('lists the week in the Persian order', () => {
    expect(WEEKDAYS.map((day) => day.label)).toEqual([
      'شنبه',
      'یکشنبه',
      'دوشنبه',
      'سه‌شنبه',
      'چهارشنبه',
      'پنجشنبه',
      'جمعه',
    ])
  })

  it('maps the Persian days to the Python weekday numbers', () => {
    expect(WEEKDAYS.map((day) => day.value)).toEqual([5, 6, 0, 1, 2, 3, 4])
    expect(weekdayLabel(5)).toBe('شنبه')
    expect(weekdayLabel(4)).toBe('جمعه')
    expect(weekdayLabel(9)).toBe('—')
  })
})

describe('the calendar helpers', () => {
  it('adds days to an ISO date', () => {
    expect(addDays('2026-10-22', 3)).toBe('2026-10-25')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-22', -1)).toBe('2026-10-21')
  })

  it('writes a date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('knows today', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('the Jalali calendar', () => {
  it('turns an ISO date into its Jalali parts', () => {
    expect(isoToJalali('2026-10-22')).toEqual({ year: 1405, month: 7, day: 30 })
    expect(isoToJalali('2027-03-21')).toEqual({ year: 1406, month: 1, day: 1 })
  })

  it('turns the Jalali parts back into the ISO date', () => {
    expect(jalaliToISO(1405, 7, 30)).toBe('2026-10-22')
    expect(jalaliToISO(1406, 1, 1)).toBe('2027-03-21')
  })

  it('knows the length of every month', () => {
    expect(jalaliMonthLength(1405, 1)).toBe(31)
    expect(jalaliMonthLength(1405, 7)).toBe(30)
    expect(jalaliMonthLength(1405, 11)).toBe(30)
    // اسفند is 30 days in a leap year and 29 otherwise.
    expect(jalaliMonthLength(1403, 12)).toBe(30)
    expect(jalaliMonthLength(1405, 12)).toBe(29)
  })

  it('starts the week on Saturday', () => {
    // 2026-10-22 is a Thursday → the fifth column (شنبه = 0).
    expect(persianWeekdayIndex('2026-10-22')).toBe(5)
    expect(persianWeekdayIndex('2026-10-24')).toBe(0)
  })

  it('round-trips every day of ten years', () => {
    for (let year = 1400; year <= 1410; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const days = jalaliMonthLength(year, month)
        for (let day = 1; day <= days; day += 1) {
          const iso = jalaliToISO(year, month, day)
          expect(isoToJalali(iso)).toEqual({ year, month, day })
        }
      }
    }
  })
})
