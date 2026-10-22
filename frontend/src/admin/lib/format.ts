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

const jalaliWeekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' })

/** `2026-10-22` → `۲۲ آبان ۱۴۰۵` */
export function formatJalali(iso: string): string {
  return faDigits(jalaliDate.format(parseISODate(iso)))
}

/** `2026-10-22` → `شنبه` */
export function formatJalaliWeekday(iso: string): string {
  return faDigits(jalaliWeekday.format(parseISODate(iso)))
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
