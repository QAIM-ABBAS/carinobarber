import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** A small button (the row actions of the tables). */
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ReactNode
}

/** The button of the admin panel: square, brass or outlined. */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['ad-btn', `ad-btn--${variant}`, `ad-btn--${size}`, className]
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
      {loading ? <span className="ad-btn__spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
