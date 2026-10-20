/**
 * Booking helpers.
 *
 * The days, the slots and the booking itself now come from the API
 * (`GET /availability` and `POST /bookings`). The static data in
 * `data/content.ts` is only used as a fallback while the API is unreachable.
 */

import { createBooking, fetchAvailability, type ApiDay } from './api'

export interface BookingPayload {
  serviceId: string
  /** Local date, `YYYY-MM-DD` */
  date: string
  /** `HH:mm` (24h) */
  time: string
  name: string
  phone: string
}

export interface BookingResult {
  code: string
  status: string
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export const toFaDigits = (v: string | number) => String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)])

/** Accepts Persian / Arabic-Indic digits and returns plain ASCII digits. */
export const toEnDigits = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))

/** Iranian mobile number, e.g. 09123456789 (also accepts +98 / 0098 prefixes). */
export function normalizePhone(raw: string): string | null {
  const digits = toEnDigits(raw).replace(/[\s\-()+]/g, '')
  const m = digits.match(/^(?:0098|98|0)?(9\d{9})$/)
  return m ? `0${m[1]}` : null
}

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Parses `YYYY-MM-DD` as a *local* date (no UTC shift). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

/** `400000` → `۴۰۰٬۰۰۰` */
export const formatPrice = (value: number) =>
  toFaDigits(value.toLocaleString('en-US')).replace(/,/g, '٬')

export interface BookableDay {
  iso: string
  date: Date
  weekday: string // شنبه
  day: string // ۲۷
  month: string // مهر
  full: string // یکشنبه ۲۷ مهر
  closed: boolean
  /** false when closed or every slot is taken / past */
  available: boolean
  slots: Slot[]
}

export interface Slot {
  time: string
  disabled: boolean
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', opts)
const weekdayFmt = fmt({ weekday: 'long' })
const dayFmt = fmt({ day: 'numeric' })
const monthFmt = fmt({ month: 'long' })
const fullFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' })

function toBookableDay(day: ApiDay): BookableDay {
  const date = parseISODate(day.date)
  return {
    iso: day.date,
    date,
    weekday: weekdayFmt.format(date),
    day: dayFmt.format(date),
    month: monthFmt.format(date),
    full: fullFmt.format(date),
    closed: day.closed,
    available: day.available,
    slots: day.slots.map((slot) => ({ time: slot.time, disabled: !slot.available })),
  }
}

/**
 * The days the customer can book.
 *
 * The shop decides which day "today" is, so no start date is sent and the
 * availability always matches the server (including the closing days, the
 * holidays and the slots that are already taken).
 */
export async function getBookableDays(count = 14): Promise<BookableDay[]> {
  const data = await fetchAvailability(undefined, count)
  return data.days.map(toBookableDay)
}

/** The slots of a day (already loaded with the day). */
export function getSlots(day: BookableDay): Slot[] {
  return day.slots
}

export const formatTime = (t: string) => toFaDigits(t)

/** Books a slot. Throws an `ApiError` with the Persian message of the server. */
export async function submitBooking(payload: BookingPayload): Promise<BookingResult> {
  const booking = await createBooking({
    service_id: payload.serviceId,
    date: payload.date,
    time: payload.time,
    name: payload.name,
    phone: payload.phone,
  })
  return { code: booking.code, status: booking.status }
}
