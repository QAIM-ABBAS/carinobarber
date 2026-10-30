import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './DangerButton.css'

export type DangerButtonAppearance = 'solid' | 'outline'
export type DangerButtonSize = 'sm' | 'md' | 'lg'

export interface DangerButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The label of the button. */
  children: ReactNode
  /**
   * `solid` is the filled version (admin row actions and confirm dialogs);
   * `outline` is the quiet version of the public pages.
   */
  appearance?: DangerButtonAppearance
  size?: DangerButtonSize
  /** Shows a spinner and disables the button. */
  loading?: boolean
  /** Replaces the label while `loading` is true (defaults to `children`). */
  loadingLabel?: ReactNode
  /** An optional icon before the label. */
  icon?: ReactNode
  /** Stretches the button to the full width of its container. */
  block?: boolean
}

/**
 * Single source of truth for every destructive (danger) button in the project.
 * Import this component instead of writing a red button by hand, so the
 * behaviour (loading, disabled, spinner) and the look stay identical.
 */
export default function DangerButton({
  children,
  appearance = 'solid',
  size = 'md',
  loading = false,
  loadingLabel,
  icon,
  block = false,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: DangerButtonProps) {
  const classes = [
    'danger-button',
    `danger-button--${appearance}`,
    `danger-button--${size}`,
    block ? 'danger-button--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="danger-button__spinner" aria-hidden="true" />
      ) : (
        icon
      )}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  )
}
