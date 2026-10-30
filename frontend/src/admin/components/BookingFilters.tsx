import JalaliDateInput from './JalaliDateInput'
import Select from './Select'

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
 * The filter bar of the booking list: a Jalali date range, status and search.
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
        <JalaliDateInput
          id="filter-from"
          value={dateFrom}
          onChange={onDateFromChange}
        />
      </div>

      <div className="ad-filter">
        <label className="ad-filter__label" htmlFor="filter-to">
          تا تاریخ
        </label>
        <JalaliDateInput
          id="filter-to"
          value={dateTo}
          onChange={onDateToChange}
        />
      </div>

      <div className="ad-filter">
        <label className="ad-filter__label" htmlFor="filter-status">
          وضعیت
        </label>
        <Select
          id="filter-status"
          value={status}
          onChange={onStatusChange}
          placeholder="همهٔ وضعیت‌ها"
          options={[
            { value: '', label: 'همهٔ وضعیت‌ها' },
            ...statusOptions.map((option) => ({ value: option.value, label: option.label })),
          ]}
        />
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
