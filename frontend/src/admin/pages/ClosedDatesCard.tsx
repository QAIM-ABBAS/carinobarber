import { useState, type FormEvent } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useAddClosedDate, useClosedDates, useDeleteClosedDate } from '../api/hooks'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Field from '../components/Field'
import Skeleton from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { formatJalali, todayISO } from '../lib/format'
import { TrashIcon } from '../layout/icons'

/** The holidays of the shop: the days the barbershop does not open. */
export default function ClosedDatesCard() {
  const closedDates = useClosedDates()
  const add = useAddClosedDate()
  const remove = useDeleteClosedDate()
  const { push } = useToast()

  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!date) {
      setError('تاریخ تعطیلی را انتخاب کنید.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await add.mutateAsync({ date, reason: reason.trim() || null })
      push('روز تعطیل به تقویم اضافه شد.', 'success')
      setDate('')
      setReason('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (deleting === null) return
    setBusy(true)
    try {
      await remove.mutateAsync(deleting)
      push('روز تعطیل حذف شد.', 'success')
      setDeleting(null)
    } catch (err) {
      push(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE, 'error')
    } finally {
      setBusy(false)
    }
  }

  const items = closedDates.data ?? []
  const today = todayISO()

  return (
    <section className="ad-card" aria-labelledby="closed-dates">
      <div className="ad-card__head">
        <h2 className="ad-card__title" id="closed-dates">
          تعطیلات و روزهای بسته
        </h2>
        <span className="ad-card__meta">این روزها در صفحهٔ رزرو بسته هستند.</span>
      </div>

      <form className="ad-closed-add" onSubmit={onSubmit} noValidate>
        <Field label="تاریخ" htmlFor="closed-date">
          <input
            id="closed-date"
            className="ad-input"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              setError(null)
            }}
            aria-invalid={Boolean(error)}
          />
        </Field>
        <Field label="دلیل (اختیاری)" htmlFor="closed-reason">
          <input
            id="closed-reason"
            className="ad-input"
            type="text"
            value={reason}
            maxLength={200}
            placeholder="مثلاً تعطیل رسمی"
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <Button type="submit" loading={busy} className="ad-closed-add__button">
          افزودن تعطیلی
        </Button>
      </form>

      {error && (
        <p className="ad-alert ad-alert--error" role="alert">
          {error}
        </p>
      )}

      {closedDates.isPending ? (
        <div className="ad-skeleton-list" aria-hidden="true">
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      ) : closedDates.isError ? (
        <ErrorState
          message={
            closedDates.error instanceof ApiError
              ? closedDates.error.message
              : GENERIC_ERROR_MESSAGE
          }
          onRetry={() => void closedDates.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState title="روز تعطیلی ثبت نشده است" />
      ) : (
        <ul className="ad-closed-list">
          {items.map((item) => (
            <li
              className="ad-closed-list__item"
              key={item.id}
              data-past={item.date < today}
            >
              <div className="ad-closed-list__text">
                <span className="ad-closed-list__date">{formatJalali(item.date)}</span>
                <span className="ad-closed-list__iso" dir="ltr">
                  {item.date}
                </span>
                {item.reason && <span className="ad-closed-list__reason">{item.reason}</span>}
              </div>
              <Button
                size="sm"
                variant="danger"
                icon={<TrashIcon />}
                aria-label={`حذف تعطیلی ${item.date}`}
                onClick={() => setDeleting(item.id)}
              >
                حذف
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="حذف روز تعطیل"
        message="این روز دوباره در صفحهٔ رزرو باز می‌شود."
        confirmLabel="حذف کن"
        danger
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
