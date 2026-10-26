import { toFaDigits } from '../lib/booking'

interface OtpDevBoxProps {
  /** The plain code the request answer returned (dev mode: `OTP_DEV_MODE=true`). */
  code: string
  /** The verify step is busy — the fill button is disabled with it. */
  disabled?: boolean
  /** «پر کردن خودکار» — the caller puts the code into its code input. */
  onFill: () => void
}

/**
 * DEV BOX of the OTP step — a prominent brass box with the code on screen while
 * the SMS provider does not exist yet (`OTP_DEV_MODE=true`). The caller renders
 * it only when the request answer carries a `dev_code`; deleting this export and
 * the one conditional around it removes the whole dev behaviour.
 */
export default function OtpDevBox({ code, disabled = false, onFill }: OtpDevBoxProps) {
  return (
    <div className="ac-devbox" role="status">
      <p className="ac-devbox__note">حالت آزمایشی — پیامک فعال نیست. کد شما:</p>
      <p className="ac-devbox__code" dir="ltr">
        {toFaDigits(code)}
      </p>
      <button type="button" className="ac-btn ac-btn--ghost ac-btn--small" onClick={onFill} disabled={disabled}>
        پر کردن خودکار
      </button>
    </div>
  )
}
