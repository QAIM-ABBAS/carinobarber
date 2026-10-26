import { useEffect, useId, useRef } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** A red confirm button (destructive actions like cancelling a booking). */
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * The accessible confirm dialog of the public pages (used by the «حساب» page):
 * labelled dialog, focus trap, Escape closes, the focus returns to the opener.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel

  useEffect(() => {
    if (!open) return
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      openerRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="ac-dialog">
      <div className="ac-dialog__backdrop" aria-hidden="true" onClick={() => cancelRef.current()} />
      <div
        className="ac-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <h2 className="ac-dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="ac-dialog__message">{message}</p>
        <div className="ac-dialog__actions">
          <button
            type="button"
            className={`ac-btn${danger ? ' ac-btn--danger' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && (
              <span className={`ac-spinner${danger ? ' ac-spinner--light' : ''}`} aria-hidden="true" />
            )}
            {loading ? 'در حال انجام…' : confirmLabel}
          </button>
          <button
            type="button"
            className="ac-btn ac-btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
