import Button from './Button'
import DangerButton from '../../components/DangerButton'
import Modal from './Modal'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** A red confirm button (the destructive actions). */
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** The confirmation of a destructive action (cancel a booking, delete a holiday). */
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
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          {danger ? (
            <DangerButton onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </DangerButton>
          ) : (
            <Button onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          )}
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      <p className="ad-confirm__message">{message}</p>
    </Modal>
  )
}
