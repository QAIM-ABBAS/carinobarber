/**
 * Booking helpers (frontend only).
 * Replace `submitBooking` with a real API call when you add a backend.
 */

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
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', opts)
const weekdayFmt = fmt({ weekday: 'long' })
const dayFmt = fmt({ day: 'numeric' })
const monthFmt = fmt({ month: 'long' })
const fullFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' })

/** Days the shop is closed (0 = Sunday … 5 = Friday). */
const CLOSED_WEEKDAYS = [5]

export function getBookableDays(count = 14, from = new Date()): BookableDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const day: BookableDay = {
      iso: toISODate(date),
      date,
      weekday: weekdayFmt.format(date),
      day: dayFmt.format(date),
      month: monthFmt.format(date),
      full: fullFmt.format(date),
      closed: CLOSED_WEEKDAYS.includes(date.getDay()),
      available: true,
    }
    day.available = getSlots(day, from).some((s) => !s.disabled)
    return day
  })
}

export interface Slot {
  time: string
  disabled: boolean
}

const OPEN_HOUR = 10
const CLOSE_HOUR = 21 // last slot starts at 20:00

/** Cheap deterministic hash so "taken" slots look stable per day (demo data). */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Time slots for a day. Past slots (today) are disabled; some slots are
 * pseudo-randomly "taken" — swap this for real availability from your API.
 */
export function getSlots(day: BookableDay, now = new Date()): Slot[] {
  const slots: Slot[] = []
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    const time = `${pad(h)}:00`
    const isPast = day.iso === toISODate(now) && h <= now.getHours()
    const taken = hash(`${day.iso}-${time}`) % 100 < 28
    slots.push({ time, disabled: day.closed || isPast || taken })
  }
  return slots
}

export const formatTime = (t: string) => toFaDigits(t)

export async function submitBooking(payload: BookingPayload): Promise<BookingResult> {
  // TODO: replace with your API, e.g.
  // const res = await fetch('/api/bookings', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
  // if (!res.ok) throw new Error('booking failed')
  // return res.json()
  void payload
  await new Promise((r) => setTimeout(r, 900))
  const code = toFaDigits(String(hash(JSON.stringify(payload)) % 900000 + 100000))
  return { code }
}
