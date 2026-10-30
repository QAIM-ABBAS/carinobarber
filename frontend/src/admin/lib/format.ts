/**
 * Formatting helpers of the admin panel.
 *
 * Every number the admin sees is written with Persian digits, every date is shown in
 * the Jalali calendar (the API keeps the Gregorian ISO date) and the status labels
 * live here so the whole panel speaks the same language.
 */

import type { BookingStatus } from '../api/types'

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** `1405` → `۱۴۰۵` */
export function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)])
}

/** `1234` → `۱٬۲۳۴` (Persian digits with the Persian thousands separator) */
export function formatNumber(value: number): string {
  return faDigits(value.toLocaleString('en-US')).replace(/,/g, '٬')
}

/** `400000` → `۴۰۰٬۰۰۰` (Toman, with the Persian thousands separator) */
export function formatToman(value: number): string {
  return formatNumber(value)
}

/** `12:00` → `۱۲:۰۰` */
export function formatTime(time: string): string {
  return faDigits(time)
}

/** Parses `YYYY-MM-DD` as a *local* date (no UTC shift). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

/** A `Date` as `YYYY-MM-DD` (local time). */
export function toISODate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today of the browser as `YYYY-MM-DD`. */
export function todayISO(): string {
  return toISODate(new Date())
}

/** `2026-10-22` + 3 days → `2026-10-25` */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const jalaliShortDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

const jalaliWeekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' })

/** `2026-10-22` → `۲۲ آبان ۱۴۰۵` */
export function formatJalali(iso: string): string {
  return faDigits(jalaliDate.format(parseISODate(iso)))
}

/** `2026-10-22` → `۱۴۰۵/۰۸/۰۱` (Jalali, numeric, Persian digits) — used as input placeholder/hint */
export function formatJalaliNumeric(iso: string): string {
  return faDigits(jalaliShortDate.format(parseISODate(iso)))
}

/** `2026-10-22` → `شنبه` */
export function formatJalaliWeekday(iso: string): string {
  return faDigits(jalaliWeekday.format(parseISODate(iso)))
}

/**
 * Converts a Jalali date (jY, jM, jD) to a Gregorian ISO string `YYYY-MM-DD`.
 * Pure arithmetic — no library needed.
 * Algorithm: https://www.fourmilab.ch/documents/calendar/
 */
export function jalaliToISO(jYear: number, jMonth: number, jDay: number): string {
  // Convert Jalali to Julian Day Number
  const jy = jYear - 979
  const jm = jMonth - 1
  const jd = jDay - 1
  let jDayNo = 365 * jy + Math.floor(jy / 4) * 8 - Math.floor(jy / 100) + Math.floor(jy / 400)
  for (let i = 0; i < jm; i++) jDayNo += [31,31,31,31,31,31,30,30,30,30,30,29][i] ?? 0
  jDayNo += jd
  // Convert Julian Day Number to Gregorian
  let gDayNo = jDayNo + 79
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097)
  gDayNo = gDayNo % 146097
  let leap = true
  if (gDayNo >= 36525) {
    gDayNo++
    gy += 100 * Math.floor(gDayNo / 36524)
    gDayNo = gDayNo % 36524
    if (gDayNo >= 365) gDayNo++
    else leap = false
  }
  gy += 4 * Math.floor(gDayNo / 1461)
  gDayNo %= 1461
  if (gDayNo >= 366) {
    leap = false
    gDayNo--
    gy += Math.floor(gDayNo / 365)
    gDayNo = gDayNo % 365
  }
  const gMonthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  for (gm = 0; gm < 12; gm++) {
    const d = gMonthDays[gm] ?? 0
    if (gDayNo < d) break
    gDayNo -= d
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${gy}-${pad(gm + 1)}-${pad(gDayNo + 1)}`
}

/**
 * Parses a Jalali date string typed by the user.
 * Accepts: `1404/08/10`, `1404-08-10`, `14040810` (with Persian or ASCII digits).
 * Returns a Gregorian `YYYY-MM-DD` string, or `null` if the input is invalid.
 */
export function parseJalaliInput(raw: string): string | null {
  // Normalise Persian digits to ASCII
  const s = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  const m = s.match(/^(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m.map(Number)
  if (!y || !mo || !d) return null
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  if (y < 1300 || y > 1500) return null
  try {
    return jalaliToISO(y, mo, d)
  } catch {
    return null
  }
}

/** `2026-10-22` + `12:00` → `۲۲ آبان ۱۴۰۵ — ساعت ۱۲:۰۰` */
export function formatJalaliDateTime(iso: string, time: string): string {
  return `${formatJalali(iso)} — ساعت ${formatTime(time)}`
}

/** The Persian label of every booking status. */
export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'در انتظار تأیید',
  confirmed: 'تأیید شده',
  completed: 'انجام شده',
  cancelled: 'لغو شده',
  no_show: 'عدم حضور',
}

/** The order the statuses appear in the filters. */
export const STATUS_ORDER: BookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]

/**
 * The transitions the API allows. It mirrors `ALLOWED_TRANSITIONS` of
 * `backend/app/services/admin.py`; the server stays the authority.
 */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}

/**
 * The week in the Persian order. The value is the Python weekday number of the
 * backend (Monday = 0 … Sunday = 6), so شنبه = 5 and جمعه = 4.
 */
export const WEEKDAYS: readonly { value: number; label: string }[] = [
  { value: 5, label: 'شنبه' },
  { value: 6, label: 'یکشنبه' },
  { value: 0, label: 'دوشنبه' },
  { value: 1, label: 'سه‌شنبه' },
  { value: 2, label: 'چهارشنبه' },
  { value: 3, label: 'پنجشنبه' },
  { value: 4, label: 'جمعه' },
]

/** The Persian label of a Python weekday number. */
export function weekdayLabel(value: number): string {
  return WEEKDAYS.find((day) => day.value === value)?.label ?? '—'
}
