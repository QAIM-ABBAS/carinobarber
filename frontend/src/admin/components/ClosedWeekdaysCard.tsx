import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useSettings, useUpdateSettings } from '../api/hooks'
import Button from '../components/Button'
import Skeleton from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { WEEKDAYS } from '../lib/format'

/** The card with the weekdays the shop is closed every week. */
export default function ClosedWeekdaysCard() {
  const settings = useSettings()
  const update = useUpdateSettings()
  const { push } = useToast()

  const [closedWeekdays, setClosedWeekdays] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!settings.data) return
    setClosedWeekdays(settings.data.closed_weekdays)
  }, [settings.data])

  const toggle = (day: number) => {
    setClosedWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    )
    setError(null)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await update.mutateAsync({ closed_weekdays: closedWeekdays })
      push('روزهای تعطیل هفته ذخیره شد.', 'success')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ad-card" aria-labelledby="settings-weekdays">
      <div className="ad-card__head">
        <h2 className="ad-card__title" id="settings-weekdays">
          روزهای تعطیل هفته
        </h2>
        <span className="ad-card__meta">این روزها هر هفته تعطیل هستند.</span>
      </div>

      {settings.isPending ? (
        <Skeleton height={54} />
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="ad-weekdays">
            {WEEKDAYS.map((day) => (
              <label className="ad-weekday" key={day.value}>
                <input
                  type="checkbox"
                  checked={closedWeekdays.includes(day.value)}
                  onChange={() => toggle(day.value)}
                />
                <span>{day.label}</span>
              </label>
            ))}
          </div>

          {error && (
            <p className="ad-alert ad-alert--error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={saving} className="ad-weekdays__save">
            ذخیره
          </Button>
        </form>
      )}
    </section>
  )
}
