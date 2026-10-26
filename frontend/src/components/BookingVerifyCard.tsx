import OtpVerify from './OtpVerify'
import type { OtpRequestResult, OtpVerifyResult } from '../lib/api'

interface BookingVerifyCardProps {
  /** The normalized phone that received the code (`09…`). */
  phone: string
  /** The answer of `requestOtp()` made by the booking page (has `dev_code` in dev mode). */
  initial: OtpRequestResult | null
  /** The name from step 4 — rides into the verify request (new users never type it twice). */
  name: string
  /** True after the code was accepted, while the booking is being created. */
  creating: boolean
  /** The code was correct — the caller logs in and books automatically. */
  onVerified: (result: OtpVerifyResult) => void
  /** «ویرایش شماره» — back to the form with every selection kept. */
  onBack: () => void
}

/**
 * Step 4 of the booking flow for logged-out visitors: the shared OTP step,
 * presented like the other steps of the form. All the selections of steps 1–4
 * stay visible in the summary aside while the code is being verified.
 */
export default function BookingVerifyCard({
  phone,
  initial,
  name,
  creating,
  onVerified,
  onBack,
}: BookingVerifyCardProps) {
  return (
    <fieldset className="step">
      <legend>
        <span className="step__n">۴</span>تأیید شماره موبایل
      </legend>
      <p className="book__verify-note">
        برای ثبت نوبت، شماره موبایل شما باید تأیید شود؛ کد تأیید را وارد کنید.
      </p>
      {creating ? (
        <p className="muted" role="status" aria-busy="true">
          کد تأیید شد؛ در حال ثبت نوبت…
        </p>
      ) : (
        <OtpVerify phone={phone} initial={initial} name={name} onVerified={onVerified} onBack={onBack} />
      )}
    </fieldset>
  )
}
