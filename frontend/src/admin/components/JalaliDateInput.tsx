import { useState } from 'react'
import { faDigits, formatJalali, formatJalaliNumeric, parseJalaliInput } from '../lib/format'

interface JalaliDateInputProps {
  id: string
  /** Gregorian ISO value `YYYY-MM-DD` — the value the form/API works with. */
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  className?: string
  'aria-invalid'?: boolean
  placeholder?: string
}

/**
 * A text input that accepts a Jalali date (`۱۴۰۴/۰۸/۱۰` or `1404/08/10`).
 * - Internally stores the raw typed text while the user is typing.
 * - On blur, if the input parses to a valid Gregorian date, calls `onChange`
 *   with the Gregorian ISO string and replaces the display with the clean
 *   Jalali numeric form.
 * - If parsing fails, shows an inline error and clears the value.
 * - When `value` is set externally (e.g. on reset), the display updates too.
 */
export default function JalaliDateInput({
  id,
  value,
  onChange,
  min,
  max,
  className = 'ad-input',
  placeholder = '۱۴۰۴/۰۸/۱۰',
  'aria-invalid': ariaInvalid,
}: JalaliDateInputProps) {
  // The raw text the user is currently typing
  const [raw, setRaw] = useState(() => (value ? formatJalaliNumeric(value) : ''))
  const [parseError, setParseError] = useState(false)

  // Keep display in sync when the parent resets the value
  const displayValue = raw !== '' ? raw : value ? formatJalaliNumeric(value) : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value)
    setParseError(false)
  }

  const handleBlur = () => {
    if (!raw.trim()) {
      onChange('')
      setParseError(false)
      return
    }
    const iso = parseJalaliInput(raw)
    if (!iso) {
      setParseError(true)
      return
    }
    // Range check
    if (min && iso < min) { setParseError(true); return }
    if (max && iso > max) { setParseError(true); return }

    setParseError(false)
    onChange(iso)
    // Replace raw with clean formatted Jalali
    setRaw(formatJalaliNumeric(iso))
  }

  return (
    <div className="jalali-input">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={className}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={ariaInvalid || parseError}
        dir="ltr"
        style={{ textAlign: 'right' }}
      />
      {value && !parseError && (
        <span className="jalali-input__hint">
          {formatJalali(value)}
        </span>
      )}
      {parseError && (
        <span className="jalali-input__error" role="alert">
          تاریخ شمسی معتبر نیست — مثلاً {faDigits('1404/08/10')}
        </span>
      )}
    </div>
  )
}
