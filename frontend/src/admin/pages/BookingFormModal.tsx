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
import { addDays, formatJalali, formatTime, todayISO } from '../lib/format'

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
      onClose={onClose}
      wide
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
        <Field label="خدمت" htmlFor="booking-service" error={errors.service}>
          <select
            id="booking-service"
            className="ad-select"
            value={serviceId}
            onChange={(event) => update({ serviceId: event.target.value })}
            aria-invalid={Boolean(errors.service)}
          >
            <option value="">انتخاب کنید</option>
            {activeServices.map((service) => (
              <option key={service.id} value={service.slug}>
                {service.label} — {service.price.toLocaleString('fa-IR')} تومان
              </option>
            ))}
          </select>
        </Field>

        <Field label="تاریخ نوبت" htmlFor="booking-date" error={errors.date} hint={date ? formatJalali(date) : undefined}>
          <input
            id="booking-date"
            className="ad-input"
            type="date"
            min={today}
            max={maxDate}
            value={date}
            onChange={(event) => update({ date: event.target.value, time: '' })}
            aria-invalid={Boolean(errors.date)}
          />
        </Field>

        <Field
          label="ساعت نوبت"
          htmlFor="booking-time"
          error={errors.time}
          hint={
            day?.closed
              ? 'باشگاه در این روز تعطیل است.'
              : date
                ? 'ساعت‌های رزروشده غیرفعال هستند.'
                : 'اول تاریخ را انتخاب کنید.'
          }
        >
          <select
            id="booking-time"
            className="ad-select"
            value={time}
            onChange={(event) => update({ time: event.target.value })}
            disabled={!date || !slots.length}
            aria-invalid={Boolean(errors.time)}
          >
            <option value="">انتخاب کنید</option>
            {slots.map((slot) => (
              <option key={slot.time} value={slot.time} disabled={!slot.available}>
                {formatTime(slot.time)}
                {slot.available ? '' : ' — رزرو شده'}
              </option>
            ))}
          </select>
        </Field>

        <Field label="وضعیت" htmlFor="booking-status">
          <select
            id="booking-status"
            className="ad-select"
            value={status}
            onChange={(event) => update({ status: event.target.value as 'confirmed' | 'pending' })}
          >
            <option value="confirmed">تأیید شده</option>
            <option value="pending">در انتظار تأیید</option>
          </select>
        </Field>

        <Field label="نام و نام خانوادگی" htmlFor="booking-name" error={errors.name}>
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
