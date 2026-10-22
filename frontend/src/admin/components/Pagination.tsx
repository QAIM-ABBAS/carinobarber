import { formatNumber } from '../lib/format'

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

/** The pagination of the booking list (20 rows per page). */
export default function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav className="ad-pagination" aria-label="صفحه‌بندی نوبت‌ها">
      <p className="ad-pagination__info">
        {total === 0 ? (
          'بدون نوبت'
        ) : (
          <>
            {formatNumber(first)} تا {formatNumber(last)} از {formatNumber(total)}
          </>
        )}
      </p>
      <div className="ad-pagination__buttons">
        <button
          type="button"
          className="ad-btn ad-btn--ghost ad-btn--sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          قبلی
        </button>
        <span className="ad-pagination__page">
          صفحه {formatNumber(page)} از {formatNumber(pages)}
        </span>
        <button
          type="button"
          className="ad-btn ad-btn--ghost ad-btn--sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          بعدی
        </button>
      </div>
    </nav>
  )
}
