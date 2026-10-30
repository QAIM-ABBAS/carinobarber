import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { normalizePhone } from '../../lib/booking'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useAdminServices, useAvailability, useCreateBooking, useSettings } from '../api/hooks'
import type { AdminBooking } from '../api/types'
import Button from '../components/Button'
import Field from '../components/Field'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import {
  EMPTY_BOOKING_FORM,
  validateBookingForm,
  type BookingFormErrors,
  type BookingFormState,
} from '../lib/bookingForm'
import { addDays, faDigits, formatJalali, formatJalaliWeekday, formatTime, formatToman, todayISO } from '../lib/format'
import JalaliCalendar from '../components/JalaliCalendar'
import Select from '../components/Select'

export interface BookingFormModalProps {
  open: boolean
  onClose: () => void
  /** Called with the new booking. */
  onCreated?: (booking: AdminBooking) => void
}

/** The default booking window when the settings could not be loaded. */
const FALLBACK_WINDOW_DAYS = 14

/**
 * The modal that creates a booking by hand (a phone booking or a walk-in).
 *
 * The list of the free hours comes from the public availability of the chosen day,
 * so the hours that are already booked are disabled.
 */
export default function BookingFormModal({ open, onClose, onCreated }: BookingFormModalProps) {
  const [form, setForm] = useState<BookingFormState>(EMPTY_BOOKING_FORM)
  const [errors, setErrors] = useState<BookingFormErrors>({})
  const { serviceId, date, time, name, phone, status, note } = form

  const update = (patch: Partial<BookingFormState>) =>
    setForm((current) => ({ ...current, ...patch }))

  const services = useAdminServices()
  const settings = useSettings()
  const availability = useAvailability(date || undefined, 1)
  const create = useCreateBooking()
  const { push } = useToast()

  const activeServices = useMemo(
    () => (services.data ?? []).filter((service) => service.is_active),
    [services.data],
  )

  const today = todayISO()
  const maxDate = addDays(today, (settings.data?.booking_window_days ?? FALLBACK_WINDOW_DAYS) - 1)

  const day = availability.data?.days?.[0]
  // The hours of the chosen day (nothing is shown before a date is picked).
  const slots = date ? (day?.slots ?? []) : []

  // Every new opening starts with an empty form.
  useEffect(() => {
    if (!open) return
    setForm(EMPTY_BOOKING_FORM)
    setErrors({})
  }, [open])

  const validate = (): BookingFormErrors =>
    validateBookingForm({ serviceId, date, time, name, phone })

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    try {
      const booking = await create.mutateAsync({
        service_id: serviceId,
        date,
        time,
        name: name.trim(),
        phone: normalizePhone(phone) ?? '',
        status,
        admin_note: note.trim() || undefined,
      })
      push('نوبت با موفقیت ثبت شد.', 'success')
      onCreated?.(booking)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message })
        return
      }
      setErrors({ form: GENERIC_ERROR_MESSAGE })
    }
  }

  const availabilityError =
    availability.error instanceof ApiError ? availability.error.message : null

  return (
    <Modal
      open={open}
      title="ثبت نوبت دستی"
      description="خدمت را انتخاب کنید، روز را از تقویم و ساعت را از میان ساعت‌های آزاد برگزینید."
      onClose={onClose}
      wide
      footerClassName="ad-modal__foot--center"
      footer={
        <>
          <Button type="submit" form="booking-form" loading={create.isPending}>
            ثبت نوبت
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <form id="booking-form" className="ad-form ad-form--two" onSubmit={onSubmit} noValidate>
        <Field label="خدمت" htmlFor="booking-service" required error={errors.service}>
          <Select
            id="booking-service"
            value={serviceId}
            onChange={(next) => update({ serviceId: next })}
            aria-invalid={Boolean(errors.service)}
            options={activeServices.map((service) => ({
              value: service.slug,
              label: `${service.label} — ${formatToman(service.price)} تومان`,
            }))}
          />
        </Field>

        <Field label="وضعیت" htmlFor="booking-status">
          <Select
            id="booking-status"
            value={status}
            onChange={(next) => update({ status: next as 'confirmed' | 'pending' })}
            options={[
              { value: 'confirmed', label: 'تأیید شده' },
              { value: 'pending', label: 'در انتظار تأیید' },
            ]}
          />
        </Field>

        <div className="ad-form__full ad-booking-when">
          <Field
            label="روز نوبت"
            htmlFor="booking-date"
            required
            error={errors.date}
            hint={date ? `${formatJalaliWeekday(date)} — ${formatJalali(date)}` : 'روز نوبت را از تقویم انتخاب کنید.'}
          >
            <JalaliCalendar
              id="booking-date"
              value={date}
              min={today}
              max={maxDate}
              onChange={(iso) => {
                if (iso !== date) update({ date: iso, time: '' })
              }}
            />
          </Field>

          <Field
            label="ساعت نوبت"
            htmlFor="booking-time"
            required
            error={errors.time}
            hint={slots.length > 0 ? 'ساعت‌های رزروشده غیرفعال‌اند.' : undefined}
          >
            <div className="ad-slots" id="booking-time" role="group" aria-label="ساعت‌های آزاد">
              {slots.length > 0 ? (
                slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.time}
                    className="ad-slot"
                    aria-pressed={time === slot.time}
                    disabled={!slot.available}
                    onClick={() => update({ time: slot.time })}
                  >
                    {formatTime(slot.time)}
                  </button>
                ))
              ) : (
                <p className="ad-slots__empty">
                  {!date
                    ? 'اول روز را از تقویم انتخاب کنید.'
                    : availability.isFetching
                      ? 'در حال دریافت ساعت‌های آزاد…'
                      : day?.closed
                        ? 'این روز تعطیل است؛ روز دیگری را انتخاب کنید.'
                        : 'برای این روز ساعت آزادی نمانده است.'}
                </p>
              )}
            </div>
          </Field>
        </div>

        <Field label="نام و نام خانوادگی" htmlFor="booking-name" required error={errors.name}>
          <input
            id="booking-name"
            className="ad-input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => update({ name: event.target.value })}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="شماره موبایل"
          htmlFor="booking-phone"
          required
          error={errors.phone}
          hint={normalizePhone(phone) ? `شمارهٔ نرمال: ${normalizePhone(phone)}` : undefined}
        >
          <input
            id="booking-phone"
            className="ad-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            value={phone}
            onChange={(event) => update({ phone: event.target.value })}
            aria-invalid={Boolean(errors.phone)}
          />
        </Field>

        <Field
          label="یادداشت مدیر"
          htmlFor="booking-note"
          className="ad-form__full"
          hint="اختیاری — فقط برای مدیران قابل مشاهده است."
          meta={`${faDigits(note.length)} از ${faDigits(2000)} نویسه`}
        >
          <textarea
            id="booking-note"
            className="ad-textarea"
            value={note}
            maxLength={2000}
            onChange={(event) => update({ note: event.target.value })}
          />
        </Field>

        {(errors.form || availabilityError) && (
          <p className="ad-alert ad-alert--error ad-form__full" role="alert">
            {errors.form ?? availabilityError}
          </p>
        )}
      </form>
    </Modal>
  )
}
