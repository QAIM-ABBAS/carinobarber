import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

/** The empty state of a list: a short Persian message and an optional action. */
export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ad-empty">
      <p className="ad-empty__title">{title}</p>
      {description && <p className="ad-empty__description">{description}</p>}
      {action && <div className="ad-empty__action">{action}</div>}
    </div>
  )
}
