export interface SkeletonProps {
  /** The height of the block in pixels. */
  height?: number
  /** The width of the block (a number of pixels or a CSS length). */
  width?: number | string
  className?: string
}

/** The loading placeholder of the admin panel. */
export default function Skeleton({ height = 16, width = '100%', className = '' }: SkeletonProps) {
  return (
    <span
      className={`ad-skeleton ${className}`.trim()}
      style={{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width }}
      aria-hidden="true"
    />
  )
}

/** A group of skeleton lines (a list that is still loading). */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="ad-skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={44} />
      ))}
    </div>
  )
}

/** The skeleton of a table (the header and a few rows). */
export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="ad-skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="ad-skeleton-table__row" key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton key={columnIndex} height={18} />
          ))}
        </div>
      ))}
    </div>
  )
}
