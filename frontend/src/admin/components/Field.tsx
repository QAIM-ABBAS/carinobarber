import type { ReactNode } from 'react'

export interface FieldProps {
  /** The visible label of the control. */
  label: string
  /** The id of the control (the error message points to it). */
  htmlFor: string
  error?: string | null
  hint?: string
  /** Shows a brass asterisk in the label (a required field). */
  required?: boolean
  /** A small text at the end of the label row (for example a character counter). */
  meta?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * A labelled form control. The control itself is passed as a child so every kind of
 * input (input, select, textarea) can use the same label, hint and error handling.
 */
export default function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  meta,
  children,
  className = '',
}: FieldProps) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`

  return (
    <div className={`ad-field ${className}`.trim()}>
      <div className="ad-field__label-row">
        <label className="ad-field__label" htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="ad-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {meta && <span className="ad-field__meta">{meta}</span>}
      </div>
      {children}
      {hint && !error && (
        <p className="ad-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ad-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** The ids a field uses (the error and the hint). */
export const fieldIds = (htmlFor: string) => ({
  errorId: `${htmlFor}-error`,
  hintId: `${htmlFor}-hint`,
})
