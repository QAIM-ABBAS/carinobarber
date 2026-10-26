import { statusLabel } from './bookingView'

/** The coloured status badge of a booking. The Persian label is always the text. */
export default function BookingStatus({ status }: { status: string }) {
  return (
    <span className="ac-badge" data-status={status}>
      {statusLabel(status)}
    </span>
  )
}
