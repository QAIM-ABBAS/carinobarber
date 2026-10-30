import './Toggle.css'

export interface ToggleProps {
  /** Whether the switch is on. */
  checked: boolean
  /** Called with the next state when the switch changes. */
  onChange: (checked: boolean) => void
  /** The visible text of the switch (also its accessible name). */
  label: string
  /** A short line under the label that explains what the switch does. */
  description?: string
  /** Disables the switch and dims it. */
  disabled?: boolean
  /** Optional id of the underlying checkbox. */
  id?: string
  /** Optional name of the underlying checkbox. */
  name?: string
  /** Extra classes for the wrapper. */
  className?: string
}

/**
 * Single source of truth for every toggle switch in the project.
 * Use this component instead of writing a checkbox/switch by hand, so the
 * behaviour, the keyboard support and the look stay identical everywhere.
 */
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  name,
  className,
}: ToggleProps) {
  const classes = ['toggle', disabled ? 'is-disabled' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <label className={classes}>
      <input
        className="toggle__input"
        type="checkbox"
        role="switch"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {description && <span className="toggle__description">{description}</span>}
      </span>
    </label>
  )
}
