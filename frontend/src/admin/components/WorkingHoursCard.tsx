import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useSettings, useUpdateSettings } from '../api/hooks'
import type { ShopSettingsUpdate } from '../api/types'
import Button from '../components/Button'
import ErrorState from '../components/ErrorState'
import Field from '../components/Field'
import Skeleton from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { faDigits } from '../lib/format'

/** The hours of the day (the shop opens at 10 and closes at 21 by default). */
const HOURS = Array.from({ length: 25 }, (_, hour) => hour)

interface HoursForm {
  open_hour: string
  close_hour: string
  booking_window_days: string
  cancel_before_hours: string
  max_active_bookings_per_phone: string
}

const EMPTY_HOURS: HoursForm = {
  open_hour: '10',
  close_hour: '21',
  booking_window_days: '14',
  cancel_before_hours: '2',
  max_active_bookings_per_phone: '3',
}

/** The card with the working hours and the limits of the shop. */
export default function WorkingHoursCard() {
  const settings = useSettings()
  const update = useUpdateSettings()
  const { push } = useToast()

  const [hours, setHours] = useState<HoursForm>(EMPTY_HOURS)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // The form follows the settings of the shop.
  useEffect(() => {
    if (!settings.data) return
    setHours({
      open_hour: String(settings.data.open_hour),
      close_hour: String(settings.data.close_hour),
      booking_window_days: String(settings.data.booking_window_days),
      cancel_before_hours: String(settings.data.cancel_before_hours),
      max_active_bookings_per_phone: String(settings.data.max_active_bookings_per_phone),
    })
  }, [settings.data])

  const setHour = (patch: Partial<HoursForm>) => {
    setHours((current) => ({ ...current, ...patch }))
    setError(null)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const open = Number(hours.open_hour)
    const close = Number(hours.close_hour)
    if (!Number.isFinite(open) || !Number.isFinite(close) || open >= close) {
      setError('ساعت شروع باید کوچک‌تر از ساعت پایان باشد.')
      return
    }
    setSaving(true)
    setError(null)
    const payload: ShopSettingsUpdate = {
      open_hour: open,
      close_hour: close,
      booking_window_days: Number(hours.booking_window_days),
      cancel_before_hours: Number(hours.cancel_before_hours),
      max_active_bookings_per_phone: Number(hours.max_active_bookings_per_phone),
    }
    try {
      await update.mutateAsync(payload)
      push('ساعت کاری و محدودیت‌ها ذخیره شد.', 'success')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ad-card" aria-labelledby="settings-hours">
      <div className="ad-card__head">
        <h2 className="ad-card__title" id="settings-hours">
          ساعت کاری و محدودیت‌ها
        </h2>
        <span className="ad-card__meta">این مقادیر روی صفحهٔ رزرو اثر می‌گذارند.</span>
      </div>

      {settings.isPending ? (
        <div className="ad-skeleton-list" aria-hidden="true">
          <Skeleton height={54} />
          <Skeleton height={54} />
        </div>
      ) : settings.isError ? (
        <ErrorState
          message={
            settings.error instanceof ApiError ? settings.error.message : GENERIC_ERROR_MESSAGE
          }
          onRetry={() => void settings.refetch()}
        />
      ) : (
        <form className="ad-form ad-form--two" onSubmit={onSubmit} noValidate>
          <Field label="ساعت شروع" htmlFor="open-hour">
            <select
              id="open-hour"
              className="ad-select"
              value={hours.open_hour}
              onChange={(event) => setHour({ open_hour: event.target.value })}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {faDigits(hour)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ساعت پایان" htmlFor="close-hour">
            <select
              id="close-hour"
              className="ad-select"
              value={hours.close_hour}
              onChange={(event) => setHour({ close_hour: event.target.value })}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {faDigits(hour)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="بازهٔ رزرو (روز)"
            htmlFor="booking-window"
            hint="از امروز تا چند روز آینده قابل رزرو باشد (۱ تا ۶۰)."
          >
            <input
              id="booking-window"
              className="ad-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={hours.booking_window_days}
              onChange={(event) => setHour({ booking_window_days: event.target.value })}
            />
          </Field>

          <Field
            label="مهلت لغو (ساعت)"
            htmlFor="cancel-before"
            hint="مشتری تا چند ساعت قبل از نوبت می‌تواند آن را لغو کند."
          >
            <input
              id="cancel-before"
              className="ad-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={720}
              value={hours.cancel_before_hours}
              onChange={(event) => setHour({ cancel_before_hours: event.target.value })}
            />
          </Field>

          <Field
            label="حداکثر نوبت فعال برای هر شماره"
            htmlFor="max-bookings"
            hint="صفر یعنی بدون محدودیت."
            className="ad-form__full"
          >
            <input
              id="max-bookings"
              className="ad-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={hours.max_active_bookings_per_phone}
              onChange={(event) => setHour({ max_active_bookings_per_phone: event.target.value })}
            />
          </Field>

          {error && (
            <p className="ad-alert ad-alert--error ad-form__full" role="alert">
              {error}
            </p>
          )}

          <div className="ad-form__full">
            <Button type="submit" loading={saving}>
              ذخیره
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
