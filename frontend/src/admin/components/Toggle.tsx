interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

/**
 * Single source of truth for all toggle switches in the admin panel.
 * Renders a styled checkbox with a label. Uses the `.ad-switch` CSS class.
 */
export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="ad-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
