import { useEffect, useState } from 'react'
import {
  JALALI_MONTHS,
  faDigits,
  formatJalali,
  isoToJalali,
  jalaliMonthLength,
  jalaliToISO,
  persianWeekdayIndex,
  todayISO,
} from '../lib/format'

/** The short names of the Persian week (شنبه … جمعه). */
const WEEK_HEAD = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const PREV_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const NEXT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 5 7 7-7 7" />
  </svg>
)

export interface JalaliCalendarProps {
  /** The id of the group (the field points its label at it). */
  id: string
  /** The Gregorian ISO value `YYYY-MM-DD` (empty when nothing is picked). */
  value: string
  onChange: (iso: string) => void
  /** The first day that can be picked (Gregorian ISO). */
  min?: string
  /** The last day that can be picked (Gregorian ISO). */
  max?: string
}

/**
 * An inline Jalali calendar: the admin *picks* a day instead of typing a date.
 *
 * Days outside `min`…`max` are disabled, today is marked and the chosen day is
 * filled with the brass of the theme.
 */
export default function JalaliCalendar({ id, value, onChange, min, max }: JalaliCalendarProps) {
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const parts = isoToJalali(value || todayISO())
    return { year: parts.year, month: parts.month }
  })

  // Follow a value that was set from the outside (a reset, an edit).
  useEffect(() => {
    if (!value) return
    const parts = isoToJalali(value)
    setView({ year: parts.year, month: parts.month })
  }, [value])

  const today = todayISO()
  const firstISO = jalaliToISO(view.year, view.month, 1)
  const dayCount = jalaliMonthLength(view.year, view.month)
  const lead = persianWeekdayIndex(firstISO)

  // The last day of the previous month / the first day of the next one
  const prevMonth = view.month === 1 ? { year: view.year - 1, month: 12 } : { year: view.year, month: view.month - 1 }
  const nextMonth = view.month === 12 ? { year: view.year + 1, month: 1 } : { year: view.year, month: view.month + 1 }
  const prevLast = jalaliToISO(prevMonth.year, prevMonth.month, jalaliMonthLength(prevMonth.year, prevMonth.month))
  const nextFirst = jalaliToISO(nextMonth.year, nextMonth.month, 1)
  const canPrev = !min || prevLast >= min
  const canNext = !max || nextFirst <= max

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => jalaliToISO(view.year, view.month, index + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="ad-cal" id={id} role="group" aria-label="تقویم انتخاب تاریخ">
      <div className="ad-cal__head">
        <button
          type="button"
          className="ad-cal__nav"
          onClick={() => setView(nextMonth)}
          disabled={!canNext}
          aria-label="ماه بعد"
        >
          {NEXT_ICON}
        </button>
        <span className="ad-cal__title" aria-live="polite">
          {JALALI_MONTHS[view.month - 1]} {faDigits(view.year)}
        </span>
        <button
          type="button"
          className="ad-cal__nav"
          onClick={() => setView(prevMonth)}
          disabled={!canPrev}
          aria-label="ماه قبل"
        >
          {PREV_ICON}
        </button>
      </div>

      <div className="ad-cal__week" aria-hidden="true">
        {WEEK_HEAD.map((day) => (
          <span className="ad-cal__weekday" key={day}>
            {day}
          </span>
        ))}
      </div>

      <div className="ad-cal__grid">
        {cells.map((iso, index) => {
          if (!iso) {
            return <span className="ad-cal__blank" key={`blank-${index}`} aria-hidden="true" />
          }
          const selected = iso === value
          const outside = Boolean((min && iso < min) || (max && iso > max))
          const classes = [
            'ad-cal__day',
            iso === today ? 'ad-cal__day--today' : '',
            selected ? 'ad-cal__day--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              type="button"
              key={iso}
              className={classes}
              disabled={outside}
              aria-pressed={selected}
              aria-label={formatJalali(iso)}
              onClick={() => onChange(iso)}
            >
              {faDigits(isoToJalali(iso).day)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
