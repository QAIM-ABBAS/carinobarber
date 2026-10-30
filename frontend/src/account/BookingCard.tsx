import type { MyBooking } from '../lib/api'
import { formatPrice, toFaDigits } from '../lib/booking'
import DangerButton from '../components/DangerButton'
import { formatBookedAt } from './bookingView'
import BookingStatus from './BookingStatus'

interface BookingCardProps {
  booking: MyBooking
  /** True while the cancel request runs for this card (button spins+disables). */
  cancelling: boolean
  /** Opens the confirm dialog of the section. */
  onCancel: (booking: MyBooking) => void
}

/** One booking card of the «حساب» page (service, Jalali date, price, status, cancel). */
export default function BookingCard({ booking, cancelling, onCancel }: BookingCardProps) {
  return (
    <article className="ac-booking">
      <div className="ac-booking__top">
        <h3 className="ac-booking__service">{booking.service.label}</h3>
        <BookingStatus status={booking.status} />
      </div>
      <p className="ac-booking__when">{formatBookedAt(booking.date, booking.time)}</p>
      <p className="ac-booking__price">
        {formatPrice(booking.price_at_booking)}
        <small>تومان</small>
      </p>
      <p className="ac-booking__code">
        کد پیگیری: <bdi dir="ltr">{toFaDigits(booking.code)}</bdi>
      </p>
      {booking.can_cancel && (
        <div className="ac-booking__foot">
          <DangerButton
            appearance="outline"
            onClick={() => onCancel(booking)}
            disabled={cancelling}
          >
            لغو نوبت
          </DangerButton>
        </div>
      )}
    </article>
  )
}
