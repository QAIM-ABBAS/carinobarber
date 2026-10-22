import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../lib/useFocusTrap'
import { CloseIcon } from '../layout/icons'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** The actions of the footer (the buttons of the form). */
  footer?: ReactNode
  /** A wider panel (the forms of the services). */
  wide?: boolean
}

/**
 * The modal dialog of the admin panel: a labelled `role="dialog"`, the focus stays
 * inside it, Escape closes it and the focus returns to the opener.
 */
export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useFocusTrap(open, panelRef, onClose)

  if (!open) return null

  return createPortal(
    <div
      className="ad-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`ad-modal__panel ${wide ? 'ad-modal__panel--wide' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <header className="ad-modal__head">
          <h2 className="ad-modal__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="ad-modal__close"
            onClick={onClose}
            aria-label="بستن پنجره"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="ad-modal__body">{children}</div>
        {footer && <footer className="ad-modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
