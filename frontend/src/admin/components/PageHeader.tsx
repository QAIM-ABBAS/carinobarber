import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  /** The buttons of the header (the primary action of the page). */
  actions?: ReactNode
}

/** The title of a page: the Jomhuria display font plus the actions. */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="ad-page-header">
      <div className="ad-page-header__text">
        <h1 className="ad-page-header__title">{title}</h1>
        {description && <p className="ad-page-header__description">{description}</p>}
      </div>
      {actions && <div className="ad-page-header__actions">{actions}</div>}
    </header>
  )
}
