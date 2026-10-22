import { STATUS_LABELS } from '../lib/format'
import type { BookingStatus } from '../api/types'

/**
 * The badge of a booking status. The Persian label is always shown, so the color is
 * only an additional hint.
 */
export default function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`ad-badge ad-badge--${status}`} data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  )
}
