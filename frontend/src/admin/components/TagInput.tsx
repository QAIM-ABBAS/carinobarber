import { useState, type KeyboardEvent } from 'react'

export interface TagInputProps {
  label: string
  htmlFor: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  error?: string | null
  hint?: string
  max?: number
  className?: string
}

/**
 * The list of the items of a service ("شست‌وشو", "کوتاهی", …).
 *
 * Enter or a comma adds the text, the × of a tag removes it.
 */
export default function TagInput({
  label,
  htmlFor,
  value,
  onChange,
  placeholder = 'مورد را بنویسید و Enter بزنید',
  error,
  hint,
  max = 30,
  className = '',
}: TagInputProps) {
  const [text, setText] = useState('')

  const add = () => {
    const item = text.trim().replace(/,$/, '')
    if (!item) return
    if (value.includes(item)) {
      setText('')
      return
    }
    if (value.length >= max) return
    onChange([...value, item])
    setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add()
    }
    if (event.key === 'Backspace' && !text && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={`ad-field ${className}`.trim()}>
      <label className="ad-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="ad-tags">
        {value.map((item) => (
          <span className="ad-tag" key={item}>
            {item}
            <button
              type="button"
              className="ad-tag__remove"
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              aria-label={`حذف ${item}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={htmlFor}
          className="ad-input ad-tags__input"
          type="text"
          value={text}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          aria-invalid={Boolean(error)}
        />
      </div>
      {hint && !error && <p className="ad-field__hint">{hint}</p>}
      {error && (
        <p className="ad-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
