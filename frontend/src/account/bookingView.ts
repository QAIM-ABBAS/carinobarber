import { parseISODate, toFaDigits } from '../lib/booking'

/** Persian label of every booking status (the text is always shown, not only a colour). */
export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'در انتظار تأیید',
    confirmed: 'تأیید شده',
    completed: 'انجام شده',
    cancelled: 'لغو شده',
    no_show: 'عدم حضور',
  }
  return labels[status] ?? status
}

const bookedAtFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** `2026-08-01` + `17:30` → «شنبه ۱۰ مرداد، ساعت ۱۷:۳۰» (Jalali, Persian digits). */
export function formatBookedAt(date: string, time: string): string {
  return `${bookedAtFmt.format(parseISODate(date))}، ساعت ${toFaDigits(time)}`
}
