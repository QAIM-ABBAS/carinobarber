import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** Crossed scissors mark used inside the round logo badge. */
export function ScissorsMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M7.4 3.2 15.6 15M16.6 3.2 8.4 15" />
      <circle cx="7" cy="18.2" r="2.7" />
      <circle cx="17" cy="18.2" r="2.7" />
    </svg>
  )
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TelegramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168 9.079-8.016 8.199-8.024 8.19a.54.54 0 0 1-.4-.679c-.126-.576-.537-2.623-.719-3.384a.51.51 0 0 1 .161-.517c.285-.285 2.84-2.353 3.046-2.575a.267.267 0 0 0 .063-.183c.008-.177-.063-.358-.156-.496-.326-.498-1.66-1.929-2.244-2.443a.42.42 0 0 0-.551-.065c-.452.313-1.55 1.315-2.216 1.962a.363.363 0 0 1-.396.051c-.155-.105-.561-.445-.813-.736a2.63 2.63 0 0 1-.364-.381.416.416 0 0 1-.032-.416c.13-.239.463-.853.653-1.156a.373.373 0 0 1 .333-.147c.223.012.434.083.618.207.16.111.576.455.856.816.14.182.29.373.446.566.076.087.16.175.252.258.154.145.336.26.528.334.17.066.35.095.528.087.25-.012.49-.11.66-.294.16-.175.268-.406.308-.658.035-.23.026-.466-.025-.688a.436.436 0 0 0-.264-.314c-.187-.085-.408-.043-.593.125-.182.165-.487.337-.86.546-.373.209-.843.57-1.087.843-.242.272-.446.432-.656.489-.21.057-.473-.017-.69-.16a.42.42 0 0 1-.215-.441c.135-.345.348-.656.534-.924.186-.267.348-.492.394-.664.046-.172.006-.338-.087-.475-.093-.137-.266-.257-.474-.334-.208-.077-.456-.077-.677.016-.22.093-.502.284-.75.538a4.2 4.2 0 0 0-.556.653c-.17.225-.32.47-.45.735-.13.265-.24.548-.324.846-.084.298-.14.618-.166.954-.027.336.006.684.112 1.012.107.328.293.633.546.893.253.26.567.472.91.622.343.15.71.236 1.078.253.368.016.73-.06 1.062-.225.332-.164.63-.414.876-.733.246-.319.433-.7.546-1.126.113-.426.037-.89-.214-1.29a2.26 2.26 0 0 0-.656-.622c-.23-.163-.504-.246-.785-.232-.28.014-.56.11-.78.273a1.26 1.26 0 0 0-.434.576c-.14.347-.08.74.166 1.034.246.294.646.456 1.016.443.37-.013.72-.18 1.004-.481.284-.301.58-.823.716-1.24.136-.417.06-.744-.088-1.006a.65.65 0 0 0-.354-.334c-.214-.085-.46-.06-.66.056-.2.116-.46.328-.69.586-.23.258-.43.568-.58.883-.15.315-.25.632-.295.938-.046.306.01.608.16.876.15.268.4.492.7.646.3.154.66.226.998.208.338-.018.652-.15.89-.386.238-.236.396-.57.444-.918.048-.348.01-.69-.116-.986a1.36 1.36 0 0 0-.342-.534c-.22-.236-.56-.375-.9-.392-.34-.017-.67.084-.93.288a1.64 1.64 0 0 0-.64.688c-.21.42-.09.88.316 1.236.406.356 1.01.472 1.54.312.53-.16.97-.536 1.25-1.03.28-.494.38-1.09.26-1.63a2.46 2.46 0 0 0-.616-1.044c-.32-.42-.82-.64-1.36-.61-.54.03-.99.36-1.28.816-.29.456-.41.99-.33 1.51.08.52.39.99.86 1.31.47.32 1.06.47 1.6.42.54-.05 1.04-.33 1.39-.76.35-.43.53-.98.51-1.54z" />
    </svg>
  )
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

/** Arrow for the CTA. Points left because the page is RTL. */
export function ArrowStart(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 12H4M10 5l-7 7 7 7" />
    </svg>
  )
}

/* Contact icons of the footer. */

export function MobileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M11 18.4h2" />
    </svg>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21.5 16.9v2.8a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.8a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.7 10a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  )
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 10.5c0 6.2-8 12-8 12s-8-5.8-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10.3" r="2.9" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M4 8h16M4 16h16" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/* Icon set of the account page (`/account`). */

export function PencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
