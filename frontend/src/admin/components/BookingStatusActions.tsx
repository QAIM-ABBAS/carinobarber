import { useState } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useUpdateBooking } from '../api/hooks'
import type { AdminBooking, BookingStatus } from '../api/types'
import { ALLOWED_TRANSITIONS, STATUS_LABELS } from '../lib/format'
import Button from './Button'
import ConfirmDialog from './ConfirmDialog'
import DangerButton from '../../components/DangerButton'
import { useToast } from './Toast'

export interface BookingStatusActionsProps {
  booking: AdminBooking
  /** Called after a successful change. */
  onDone?: () => void
}

/** The statuses that need a confirmation before they are applied. */
const NEEDS_CONFIRMATION: BookingStatus[] = ['cancelled', 'no_show']

/**
 * The buttons of a booking row: only the transitions the API allows. «لغو» و
 * «عدم حضور» are confirmed first.
 */
export default function BookingStatusActions({ booking, onDone }: BookingStatusActionsProps) {
  const [confirming, setConfirming] = useState<BookingStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const update = useUpdateBooking()
  const { push } = useToast()

  const transitions = ALLOWED_TRANSITIONS[booking.status] ?? []

  const apply = async (status: BookingStatus) => {
    setBusy(true)
    try {
      await update.mutateAsync({ id: booking.id, status })
      push(`وضعیت نوبت به «${STATUS_LABELS[status]}» تغییر کرد.`, 'success')
      onDone?.()
    } catch (err) {
      push(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE, 'error')
    } finally {
      setBusy(false)
    }
  }

  const onClick = (status: BookingStatus) => {
    if (NEEDS_CONFIRMATION.includes(status)) {
      setConfirming(status)
      return
    }
    void apply(status)
  }

  if (transitions.length === 0) return null

  return (
    <>
      {transitions.map((status) => {
        const isDanger = status === 'cancelled' || status === 'no_show'
        return isDanger ? (
          <DangerButton
            key={status}
            size="sm"
            onClick={() => onClick(status)}
            loading={busy}
          >
            {STATUS_LABELS[status]}
          </DangerButton>
        ) : (
          <Button
            key={status}
            size="sm"
            variant="secondary"
            onClick={() => onClick(status)}
            loading={busy}
          >
            {STATUS_LABELS[status]}
          </Button>
        )
      })}

      <ConfirmDialog
        open={confirming !== null}
        title={confirming ? `«${STATUS_LABELS[confirming]}»؟` : ''}
        message={
          confirming === 'cancelled'
            ? 'با لغو این نوبت، ساعت آن دوباره آزاد می‌شود و مشتری می‌تواند نوبت جدید بگیرد.'
            : 'این نوبت به‌عنوان «عدم حضور» ثبت می‌شود.'
        }
        confirmLabel={confirming ? STATUS_LABELS[confirming] : 'تأیید'}
        danger
        loading={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const status = confirming
          setConfirming(null)
          if (status) void apply(status)
        }}
      />
    </>
  )
}
