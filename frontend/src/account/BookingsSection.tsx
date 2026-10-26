import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  cancelMyBooking,
  getMyBookings,
  type MyBooking,
  type MyBookingsScope,
} from '../lib/api'
import { formatBookedAt } from './bookingView'
import BookingCard from './BookingCard'
import ConfirmDialog from '../components/ConfirmDialog'

const GENERIC_ERROR = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'
const EMPTY_TEXT: Record<Exclude<MyBookingsScope, 'all'>, string> = {
  upcoming: 'نوبت پیش‌رویی ندارید.',
  past: 'سابقه نوبتی ندارید.',
}

type Scope = Exclude<MyBookingsScope, 'all'>
type Load = { status: 'loading' | 'ready' | 'error'; items: MyBooking[]; error: string | null }

const initialLoad: Load = { status: 'loading', items: [], error: null }

export default function BookingsSection() {
  const [tab, setTab] = useState<Scope>('upcoming')
  const [data, setData] = useState<Record<Scope, Load>>({ upcoming: initialLoad, past: initialLoad })
  const [pending, setPending] = useState<MyBooking | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const tabRef = useRef<HTMLDivElement | null>(null)

  /** (Re)loads both scopes; cards already on screen stay visible meanwhile. */
  const refresh = useCallback(() => {
    const scopes: Scope[] = ['upcoming', 'past']
    for (const scope of scopes) {
      getMyBookings(scope)
        .then((items) => {
          setData((current) => ({ ...current, [scope]: { status: 'ready', items, error: null } }))
        })
        .catch((err: unknown) => {
          setData((current) => ({
            ...current,
            [scope]: {
              status: 'error',
              items: current[scope].items,
              error: err instanceof ApiError ? err.message : GENERIC_ERROR,
            },
          }))
        })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onTabKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next: Scope = tab === 'upcoming' ? 'past' : 'upcoming'
    setTab(next)
    tabRef.current?.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus()
  }

  const confirmCancel = async () => {
    if (!pending) return
    const target = pending
    setCancelling(true)
    try {
      await cancelMyBooking(target.code)
      setPending(null)
      setNotice({ kind: 'ok', text: `نوبت «${target.service.label}» لغو شد.` })
    } catch (err) {
      setPending(null)
      setNotice({ kind: 'err', text: err instanceof ApiError ? err.message : GENERIC_ERROR })
    } finally {
      setCancelling(false)
      refresh()
    }
  }

  return (
    <div className="ac-bookings-block">
      <h2 className="ac-bookings__title">نوبت‌های من</h2>
      <div className="ac-tabs" role="tablist" aria-label="نوبت‌های من" ref={tabRef}>
        <button
          type="button"
          role="tab"
          className="ac-tab"
          id="tab-upcoming"
          aria-selected={tab === 'upcoming'}
          aria-controls="panel-upcoming"
          tabIndex={tab === 'upcoming' ? 0 : -1}
          onClick={() => setTab('upcoming')}
          onKeyDown={onTabKey}
        >
          نوبت‌های پیش‌رو
        </button>
        <button
          type="button"
          role="tab"
          className="ac-tab"
          id="tab-past"
          aria-selected={tab === 'past'}
          aria-controls="panel-past"
          tabIndex={tab === 'past' ? 0 : -1}
          onClick={() => setTab('past')}
          onKeyDown={onTabKey}
        >
          سابقه نوبت‌ها
        </button>
      </div>

      {notice && (
        <p className={notice.kind === 'ok' ? 'ac-ok' : 'ac-err ac-err--box'} aria-live="polite">
          {notice.text}
        </p>
      )}

      {(Object.keys(EMPTY_TEXT) as Scope[]).map((scope) => (
        <div
          key={scope}
          role="tabpanel"
          id={`panel-${scope}`}
          aria-labelledby={`tab-${scope}`}
          hidden={tab !== scope}
        >
          <BookingsList
            load={data[scope]}
            emptyText={EMPTY_TEXT[scope]}
            cancelling={cancelling}
            onCancel={setPending}
            onRetry={refresh}
          />
        </div>
      ))}

      <ConfirmDialog
        open={pending !== null}
        title="لغو نوبت"
        message={
          pending
            ? `نوبت «${pending.service.label}» در ${formatBookedAt(pending.date, pending.time)} لغو شود؟ این کار قابل بازگشت نیست.`
            : ''
        }
        confirmLabel="بله، لغو شود"
        danger
        loading={cancelling}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

interface ListProps {
  load: Load
  emptyText: string
  /** True while a cancel request runs — every cancel button is disabled. */
  cancelling: boolean
  onCancel: (booking: MyBooking) => void
  /** Reloads both scopes (the retry of an error state). */
  onRetry: () => void
}

function BookingsList({ load, emptyText, cancelling, onCancel, onRetry }: ListProps) {
  if (load.status === 'loading' && !load.items.length) {
    return (
      <div className="ac-bookings" aria-busy="true">
        <span className="ac-skeleton" />
        <span className="ac-skeleton" />
        <span className="ac-skeleton" />
      </div>
    )
  }
  if (load.status === 'error' && !load.items.length) {
    return (
      <div className="ac-error">
        <p className="ac-err">{load.error}</p>
        <button type="button" className="ac-btn" onClick={onRetry}>
          تلاش دوباره
        </button>
      </div>
    )
  }
  if (!load.items.length) {
    return (
      <div className="ac-empty">
        <p className="ac-muted">{emptyText}</p>
        <Link to="/book" className="ac-btn">
          رزرو نوبت جدید
        </Link>
      </div>
    )
  }
  return (
    <div className="ac-bookings" aria-busy={load.status === 'loading' ? 'true' : undefined}>
      {load.status === 'loading' && <p className="ac-muted">در حال به‌روزرسانی…</p>}
      {load.status === 'error' && (
        <p className="ac-err ac-err--box">
          به‌روزرسانی فهرست انجام نشد.{' '}
          <button type="button" className="ac-link" onClick={onRetry}>
            تلاش دوباره
          </button>
        </p>
      )}
      {load.items.map((booking) => (
        <BookingCard
          key={booking.code}
          booking={booking}
          cancelling={cancelling}
          onCancel={onCancel}
        />
      ))}
    </div>
  )
}
