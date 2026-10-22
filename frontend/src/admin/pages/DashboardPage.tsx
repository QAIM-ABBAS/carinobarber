import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useBookings, useStats } from '../api/hooks'
import BookingStatusActions from '../components/BookingStatusActions'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import PageHeader from '../components/PageHeader'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import { addDays, formatJalali, formatTime, formatToman, todayISO } from '../lib/format'

interface StatCardProps {
  label: string
  value: string
  hint: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="ad-card ad-stat">
      <h2 className="ad-stat__label">{label}</h2>
      <p className="ad-stat__value">{value}</p>
      <p className="ad-stat__hint">{hint}</p>
    </article>
  )
}

/** The dashboard of the admin panel: the numbers of the shop. */
export default function DashboardPage() {
  const today = todayISO()
  const params = useMemo(
    () => ({ date: today, page_size: 50 }),
    [today],
  )
  const upcomingParams = useMemo(
    () => ({ date_from: addDays(today, 1), date_to: addDays(today, 7), page_size: 8 }),
    [today],
  )

  const stats = useStats()
  const todayBookings = useBookings(params, { refetchInterval: 60_000 })
  const upcomingBookings = useBookings(upcomingParams, { refetchInterval: 60_000 })

  const errorMessage =
    stats.error instanceof ApiError
      ? stats.error.message
      : stats.error
        ? GENERIC_ERROR_MESSAGE
        : null

  const todayItems = todayBookings.data?.items ?? []
  const upcomingItems = upcomingBookings.data?.items ?? []

  return (
    <div className="ad-page">
      <PageHeader
        title="داشبورد"
        description="نگاهی سریع به نوبت‌های امروز، نوبت‌های پیش‌رو و درآمد این ماه."
      />

      {stats.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void stats.refetch()} />
      ) : (
        <div className="ad-stats">
          {stats.isPending ? (
            <>
              <Skeleton height={92} />
              <Skeleton height={92} />
              <Skeleton height={92} />
            </>
          ) : (
            <>
              <StatCard
                label="نوبت‌های امروز"
                value={formatToman(stats.data?.today_bookings ?? 0)}
                hint="نوبت‌های ثبت‌شدهٔ امروز (بدون لغو شده‌ها)"
              />
              <StatCard
                label="نوبت‌های پیش‌رو"
                value={formatToman(stats.data?.upcoming_bookings ?? 0)}
                hint="نوبت‌های تأییدشده و در انتظار تأییدِ روزهای آینده"
              />
              <StatCard
                label="درآمد این ماه"
                value={formatToman(stats.data?.revenue_completed_this_month ?? 0)}
                hint="تومان — فقط نوبت‌های انجام‌شده"
              />
            </>
          )}
        </div>
      )}

      <section className="ad-card" aria-labelledby="today-bookings">
        <div className="ad-card__head">
          <h2 className="ad-card__title" id="today-bookings">
            نوبت‌های امروز
          </h2>
          <span className="ad-card__meta">{formatJalali(today)}</span>
        </div>

        {todayBookings.isPending ? (
          <div className="ad-skeleton-list" aria-hidden="true">
            <Skeleton height={52} />
            <Skeleton height={52} />
            <Skeleton height={52} />
          </div>
        ) : todayBookings.isError ? (
          <ErrorState
            message={
              todayBookings.error instanceof ApiError
                ? todayBookings.error.message
                : GENERIC_ERROR_MESSAGE
            }
            onRetry={() => void todayBookings.refetch()}
          />
        ) : todayItems.length === 0 ? (
          <EmptyState title="امروز نوبتی ثبت نشده است" />
        ) : (
          <ul className="ad-list">
            {todayItems.map((booking) => (
              <li className="ad-list__item" key={booking.id}>
                <div className="ad-list__main">
                  <span className="ad-list__time">{formatTime(booking.time)}</span>
                  <div className="ad-list__text">
                    <p className="ad-list__title">{booking.name}</p>
                    <p className="ad-list__meta">
                      {booking.service.label} — {formatToman(booking.price_at_booking)} تومان
                    </p>
                  </div>
                </div>
                <div className="ad-list__side">
                  <StatusBadge status={booking.status} />
                  <BookingStatusActions booking={booking} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ad-card" aria-labelledby="upcoming-bookings">
        <div className="ad-card__head">
          <h2 className="ad-card__title" id="upcoming-bookings">
            نوبت‌های پیش‌رو
          </h2>
          <Link className="ad-card__link" to="/admin/bookings">
            همهٔ نوبت‌ها
          </Link>
        </div>

        {upcomingBookings.isPending ? (
          <div className="ad-skeleton-list" aria-hidden="true">
            <Skeleton height={52} />
            <Skeleton height={52} />
            <Skeleton height={52} />
          </div>
        ) : upcomingBookings.isError ? (
          <ErrorState
            message={
              upcomingBookings.error instanceof ApiError
                ? upcomingBookings.error.message
                : GENERIC_ERROR_MESSAGE
            }
            onRetry={() => void upcomingBookings.refetch()}
          />
        ) : upcomingItems.length === 0 ? (
          <EmptyState title="در هفت روز آینده نوبتی ثبت نشده است" />
        ) : (
          <ul className="ad-list">
            {upcomingItems.map((booking) => (
              <li className="ad-list__item" key={booking.id}>
                <div className="ad-list__main">
                  <span className="ad-list__time">{formatTime(booking.time)}</span>
                  <div className="ad-list__text">
                    <p className="ad-list__title">{booking.name}</p>
                    <p className="ad-list__meta">
                      {formatJalali(booking.date)} — {booking.service.label}
                    </p>
                  </div>
                </div>
                <div className="ad-list__side">
                  <StatusBadge status={booking.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
