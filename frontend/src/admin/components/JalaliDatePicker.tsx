import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import JalaliCalendar from './JalaliCalendar'
import { formatJalali } from '../lib/format'

export interface JalaliDatePickerProps {
  /** The id of the trigger (the field label points at it). */
  id: string
  /** The Gregorian ISO value `YYYY-MM-DD` (empty when nothing is picked). */
  value: string
  onChange: (iso: string) => void
  /** The first day that can be picked (Gregorian ISO). */
  min?: string
  /** The last day that can be picked (Gregorian ISO). */
  max?: string
  placeholder?: string
  'aria-invalid'?: boolean
}

interface PopoverPosition {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

const CALENDAR_ICON = (
  <svg
    className="ad-datepicker__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </svg>
)

/** The width of the calendar popover. */
const POPOVER_WIDTH = 330

/**
 * A date field that opens the Jalali calendar of the panel.
 *
 * The admin picks the day from the calendar instead of typing a date; the
 * popover renders in a portal, so a card or a scroll container never clips it.
 */
export default function JalaliDatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = 'انتخاب تاریخ',
  'aria-invalid': ariaInvalid,
}: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const place = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16)
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      const roomBelow = window.innerHeight - rect.bottom - 12
      const roomAbove = rect.top - 12
      const above = roomBelow < 340 && roomAbove > roomBelow

      setPosition({
        left,
        width,
        maxHeight: Math.max(180, above ? roomAbove : roomBelow),
        ...(above
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      })
    }

    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Escape closes the calendar only.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`ad-picker__trigger ${open ? 'is-open' : ''}`.trim()}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid || undefined}
      >
        <span className={value ? 'ad-picker__value' : 'ad-picker__placeholder'}>
          {value ? formatJalali(value) : placeholder}
        </span>
        {CALENDAR_ICON}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            className="ad-datepicker__popover"
            role="dialog"
            aria-label="انتخاب تاریخ"
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
          >
            <JalaliCalendar
              id={`${id}-calendar`}
              value={value}
              min={min}
              max={max}
              onChange={(iso) => {
                onChange(iso)
                setOpen(false)
                triggerRef.current?.focus()
              }}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
