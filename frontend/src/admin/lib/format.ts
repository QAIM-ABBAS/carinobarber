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

/*
 * The Jalali calendar of the panel.
 *
 * The conversion is the pure arithmetic of the Persian calendar (the 33-year
 * cycle, as in `jalaali-js`), so the panel never depends on the ICU data of the
 * browser: the same day is shown and sent to the API everywhere.
 */

const div = (a: number, b: number) => Math.trunc(a / b)
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b

/** The years the cycle of the Persian calendar changes (jalaali-js). */
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262,
  2324, 2394, 2456, 3178,
]

interface JalaliYear {
  /** `0` when the year is a leap year. */
  leap: number
  /** The Gregorian year of the 1st of Farvardin. */
  gy: number
  /** The day of March of the 1st of Farvardin. */
  march: number
}

/** The position of a Jalali year in the cycle (jalaali-js `jalCal`). */
function jalaliYear(jy: number): JalaliYear {
  if (jy < BREAKS[0]! || jy >= BREAKS[BREAKS.length - 1]!) {
    throw new RangeError(`Invalid Jalali year ${jy}`)
  }

  let leapJ = -14
  let jp = BREAKS[0]!
  let jump = 0
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i]!
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }

  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const gy = jy + 621
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

/** A Gregorian date as a Julian day number. */
function gregorianToJDN(gy: number, gm: number, gd: number): number {
  let day =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408
  day = day - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return day
}

/** A Julian day number as a Gregorian date. */
function jdnToGregorian(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

/** A Jalali date as a Julian day number. */
function jalaliToJDN(jy: number, jm: number, jd: number): number {
  const year = jalaliYear(jy)
  return gregorianToJDN(year.gy, 3, year.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

/** A Julian day number as a Jalali date. */
function jdnToJalali(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = jdnToGregorian(jdn).gy
  let jy = gy - 621
  const year = jalaliYear(jy)
  let k = jdn - gregorianToJDN(gy, 3, year.march)

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (year.leap === 1) k += 1
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

const pad2 = (value: number) => String(value).padStart(2, '0')

/** `۱۴۰۵/۰۷/۳۰` → `2026-10-22` (the API keeps the Gregorian date). */
export function jalaliToISO(jYear: number, jMonth: number, jDay: number): string {
  const { gy, gm, gd } = jdnToGregorian(jalaliToJDN(jYear, jMonth, jDay))
  return `${gy}-${pad2(gm)}-${pad2(gd)}`
}

/** The names of the Jalali months (فروردین … اسفند). */
export const JALALI_MONTHS: readonly string[] = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

/** The three parts of a Jalali date. */
export interface JalaliParts {
  year: number
  month: number
  day: number
}

/** `2026-10-22` → `{ year: 1405, month: 7, day: 30 }` */
export function isoToJalali(iso: string): JalaliParts {
  const date = parseISODate(iso)
  const { jy, jm, jd } = jdnToJalali(
    gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate()),
  )
  return { year: jy, month: jm, day: jd }
}

/** The number of the days of a Jalali month (۳۱, ۳۰ or ۲۹/۳۰ for اسفند). */
export function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31
  if (month <= 11) return 30
  return jalaliYear(year).leap === 0 ? 30 : 29
}

/** The column of a date in the Persian week (شنبه = 0 … جمعه = 6). */
export function persianWeekdayIndex(iso: string): number {
  return (parseISODate(iso).getDay() + 1) % 7
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
