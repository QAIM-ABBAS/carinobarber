import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useBookings } from '../api/hooks'
import type { AdminBooking, BookingListParams, BookingStatus } from '../api/types'
import BookingFilters from '../components/BookingFilters'
import BookingStatusActions from '../components/BookingStatusActions'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import NoteModal from '../components/NoteModal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { SkeletonTable } from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import {
  faDigits,
  formatJalaliDateTime,
  formatToman,
  STATUS_LABELS,
  STATUS_ORDER,
} from '../lib/format'
import BookingFormModal from './BookingFormModal'

const PAGE_SIZE = 20

/** The state of the filters lives in the query string of the URL. */
interface Filters {
  date_from: string
  date_to: string
  status: string
  q: string
  page: number
}

export default function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [noteBooking, setNoteBooking] = useState<AdminBooking | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

  const filters = useMemo<Filters>(
    () => ({
      date_from: searchParams.get('date_from') ?? '',
      date_to: searchParams.get('date_to') ?? '',
      status: searchParams.get('status') ?? '',
      q: searchParams.get('q') ?? '',
      page: Math.max(1, Number(searchParams.get('page') ?? 1) || 1),
    }),
    [searchParams],
  )

  const updateFilters = useCallback((patch: Partial<Record<keyof Filters, string | number>>) => {
    // The functional form keeps the changes of two quick updates (the updater
    // always sees the current query string).
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(patch)) {
        const text = String(value ?? '')
        if (key === 'page') {
          if (text === '1') next.delete('page')
          else next.set('page', text)
          continue
        }
        if (!text) next.delete(key)
        else next.set(key, text)
      }
      // Every filter change starts again at the first page.
      if (!('page' in patch)) next.delete('page')
      return next
    })
  }, [])

  // The search field is debounced (400 ms) before it reaches the URL.
  useEffect(() => {
    if (search === filters.q) return
    const timer = window.setTimeout(() => {
      updateFilters({ q: search })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [search, filters.q, updateFilters])

  // The back button restores the search field.
  useEffect(() => {
    setSearch(filters.q)
  }, [filters.q])

  const params = useMemo<BookingListParams>(
    () => ({
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      status: (filters.status || undefined) as BookingStatus | undefined,
      q: filters.q || undefined,
      page: filters.page,
      page_size: PAGE_SIZE,
    }),
    [filters],
  )

  const { data, isPending, isError, error, refetch } = useBookings(params)

  const errorMessage =
    error instanceof ApiError ? error.message : error ? GENERIC_ERROR_MESSAGE : null

  const items = data?.items ?? []

  return (
    <div className="ad-page">
      <PageHeader
        title="نوبت‌ها"
        description="نوبت‌های ثبت‌شدهٔ باشگاه را ببینید، وضعیتشان را عوض کنید یا نوبت دستی ثبت کنید."
        actions={
          <Button onClick={() => setFormOpen(true)}>ثبت نوبت دستی</Button>
        }
      />

      <BookingFilters
        dateFrom={filters.date_from}
        dateTo={filters.date_to}
        status={filters.status}
        search={search}
        onDateFromChange={(value) => updateFilters({ date_from: value })}
        onDateToChange={(value) => updateFilters({ date_to: value })}
        onStatusChange={(value) => updateFilters({ status: value })}
        onSearchChange={setSearch}
        statusOptions={STATUS_ORDER.map((status) => ({
          value: status,
          label: STATUS_LABELS[status],
        }))}
      />

      {isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void refetch()} />
      ) : isPending ? (
        <SkeletonTable rows={6} columns={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="نوبتی پیدا نشد"
          description="با این فیلترها نوبتی ثبت نشده است. فیلترها را تغییر دهید یا یک نوبت دستی ثبت کنید."
        />
      ) : (
        <>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <caption className="ad-sr-only">فهرست نوبت‌های باشگاه</caption>
              <thead>
                <tr>
                  <th scope="col">کد</th>
                  <th scope="col">مشتری</th>
                  <th scope="col">خدمت</th>
                  <th scope="col">تاریخ و ساعت</th>
                  <th scope="col">مبلغ</th>
                  <th scope="col">وضعیت</th>
                  <th scope="col">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((booking) => (
                  <tr key={booking.id}>
                    <td data-label="کد">
                      <span className="ad-code">{faDigits(booking.code)}</span>
                    </td>
                    <td data-label="مشتری">
                      <span className="ad-customer__name">{booking.name}</span>
                      <a className="ad-customer__phone" href={`tel:${booking.phone}`} dir="ltr">
                        {faDigits(booking.phone)}
                      </a>
                    </td>
                    <td data-label="خدمت">{booking.service.label}</td>
                    <td data-label="تاریخ و ساعت">
                      {formatJalaliDateTime(booking.date, booking.time)}
                    </td>
                    <td data-label="مبلغ">{formatToman(booking.price_at_booking)}</td>
                    <td data-label="وضعیت">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td data-label="عملیات">
                      <div className="ad-actions">
                        <BookingStatusActions booking={booking} />
                        <Button size="sm" variant="ghost" onClick={() => setNoteBooking(booking)}>
                          یادداشت
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={data?.total ?? 0}
            onChange={(page) => updateFilters({ page })}
          />
        </>
      )}

      <NoteModal booking={noteBooking} onClose={() => setNoteBooking(null)} />
      <BookingFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
