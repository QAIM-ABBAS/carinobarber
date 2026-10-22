import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** The shared props of every icon of the admin panel. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/** The crossed scissors mark of the logo. */
export function ScissorsMark(props: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} {...props}>
      <path d="M7.4 3.2 15.6 15M16.6 3.2 8.4 15" />
      <circle cx="7" cy="18.2" r="2.7" />
      <circle cx="17" cy="18.2" r="2.7" />
    </svg>
  )
}

/** The dashboard (a grid of squares). */
export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="4.5" />
      <rect x="13.5" y="10.5" width="7" height="10" />
      <rect x="3.5" y="13" width="7" height="7.5" />
    </svg>
  )
}

/** The calendar of the bookings. */
export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

/** The scissors of the services. */
export function ServicesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6.5" cy="18" r="2.6" />
      <circle cx="17.5" cy="18" r="2.6" />
      <path d="M8.3 16 18 3.5M15.7 16 6 3.5" />
    </svg>
  )
}

/** The cog of the settings. */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.37a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.72 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.63 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.72h.08A1.6 1.6 0 0 0 10 3.25V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.28 9v.08a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  )
}

/** The door of the logout. */
export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5" />
      <path d="M16 8.5 19.5 12 16 15.5M19 12H9" />
    </svg>
  )
}

/** The burger of the mobile drawer. */
export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M4 8h16M4 16h16" />
    </svg>
  )
}

/** The cross of the close button. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** The plus of the "add" buttons. */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** The pencil of the edit button. */
export function EditIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  )
}

/** The bin of the delete button. */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M9.5 7V5h5v2M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

/** The star of the featured services. */
export function StarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3.5 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85L12 3.5z" />
    </svg>
  )
}

/** The arrow that points up (the "move up" button). */
export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

/** The arrow that points down (the "move down" button). */
export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  )
}

/** The magnifier of the search field. */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

/** The open eye of the "show the password" button. */
export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

/** The crossed eye of the "hide the password" button. */
export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 3.9M6.4 7.9A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 3.6-.7" />
      <path d="M9.9 9.9a2.9 2.9 0 0 0 4.1 4.1" />
    </svg>
  )
}

/** The warning of the empty and error states. */
export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.3v.2" />
    </svg>
  )
}
