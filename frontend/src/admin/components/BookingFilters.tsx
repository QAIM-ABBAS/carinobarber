import { formatJalali } from '../lib/format'

export interface BookingFiltersProps {
  dateFrom: string
  dateTo: string
  status: string
  search: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSearchChange: (value: string) => void
  /** The status options (the label and the value of every status). */
  statusOptions: { value: string; label: string }[]
}

/**
 * The filter bar of the booking list: a date range (the Gregorian input with the
 * Jalali date next to it), the status and the search field.
 */
export default function BookingFilters({
  dateFrom,
  dateTo,
  status,
  search,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onSearchChange,
  statusOptions,
}: BookingFiltersProps) {
  return (
    <section className="ad-filters" aria-label="فیلتر نوبت‌ها">
      <div className="ad-filter">
        <label className="ad-filter__label" htmlFor="filter-from">
          از تاریخ
        </label>
        <input
          id="filter-from"
          className="ad-input"
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
        />
        <p className="ad-filter__jalali">{dateFrom ? formatJalali(dateFrom) : 'همهٔ روزها'}</p>
      </div>

      <div className="ad-filter">
        <label className="ad-filter__label" htmlFor="filter-to">
          تا تاریخ
        </label>
        <input
          id="filter-to"
          className="ad-input"
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
        />
        <p className="ad-filter__jalali">{dateTo ? formatJalali(dateTo) : 'همهٔ روزها'}</p>
      </div>

      <div className="ad-filter">
        <label className="ad-filter__label" htmlFor="filter-status">
          وضعیت
        </label>
        <select
          id="filter-status"
          className="ad-select"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">همهٔ وضعیت‌ها</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ad-filter ad-filter--grow">
        <label className="ad-filter__label" htmlFor="filter-search">
          جست‌وجو (نام، موبایل یا کد)
        </label>
        <input
          id="filter-search"
          className="ad-input"
          type="search"
          value={search}
          placeholder="مثلاً ۰۹۱۲ یا ۱۲۳۴۵۶"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </section>
  )
}
