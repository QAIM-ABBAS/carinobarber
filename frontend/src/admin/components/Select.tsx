import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  /** The id of the trigger (the field label points at it). */
  id: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** Shown when nothing is selected. */
  placeholder?: string
  disabled?: boolean
  'aria-invalid'?: boolean
}

interface MenuPosition {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

const CHEVRON = (
  <svg
    className="ad-picker__chevron"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

/**
 * A dropdown of the admin panel.
 *
 * The native `<select>` shows the popup of the operating system (a bright blue
 * highlight that ignores the dark theme), so the panel uses this listbox instead:
 * it is styled with the tokens of the theme. The menu renders in a portal, next to
 * the trigger, so the scrollable body of a modal never clips it.
 */
export default function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'انتخاب کنید',
  disabled = false,
  'aria-invalid': ariaInvalid,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  /** The first enabled option from `from` in the direction `step`. */
  const enabledFrom = (from: number, step: number) => {
    for (let index = from; index >= 0 && index < options.length; index += step) {
      if (!options[index]?.disabled) return index
    }
    return -1
  }

  const openMenu = () => {
    if (disabled) return
    const start =
      selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : enabledFrom(0, 1)
    setActive(start)
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Place the menu next to the trigger and follow it while the page scrolls.
  useEffect(() => {
    if (!open) return

    const place = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16)
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      const roomBelow = window.innerHeight - rect.bottom - 12
      const roomAbove = rect.top - 12
      const wanted = Math.min(288, options.length * 42 + 12)
      const above = roomBelow < Math.min(wanted, 170) && roomAbove > roomBelow

      setPosition({
        left,
        width,
        maxHeight: Math.max(120, Math.min(wanted, above ? roomAbove : roomBelow)),
        ...(above
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      })
    }

    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, options.length])

  // A click outside the trigger and the menu closes it.
  useEffect(() => {
    if (!open) return

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Escape closes the menu only (the modal stays open).
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

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      let next = enabledFrom(active + step, step)
      if (next < 0) next = enabledFrom(step > 0 ? 0 : options.length - 1, step)
      if (next >= 0) setActive(next)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(active)
      else openMenu()
      return
    }

    if (event.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`ad-picker__trigger ${open ? 'is-open' : ''}`.trim()}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={ariaInvalid || undefined}
      >
        <span className={selected ? 'ad-picker__value' : 'ad-picker__placeholder'}>
          {selected?.label ?? placeholder}
        </span>
        {CHEVRON}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            id={listId}
            ref={menuRef}
            className="ad-picker__menu"
            role="listbox"
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className={[
                  'ad-picker__option',
                  index === active ? 'is-active' : '',
                  option.value === value ? 'is-selected' : '',
                  option.disabled ? 'is-disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                {option.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
