import type { ReactNode } from 'react'

export interface FieldProps {
  /** The visible label of the control. */
  label: string
  /** The id of the control (the error message points to it). */
  htmlFor: string
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
}

/**
 * A labelled form control. The control itself is passed as a child so every kind of
 * input (input, select, textarea) can use the same label and error handling.
 */
export default function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = '',
}: FieldProps) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`

  return (
    <div className={`ad-field ${className}`.trim()}>
      <label className="ad-field__label" htmlFor={htmlFor}>
        {label}
      </label>
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
