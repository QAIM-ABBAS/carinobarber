import { useState } from 'react'
import { bookLabel, currency, defaultActiveService, services } from '../data/content'
import { ArrowStart } from './icons'

/**
 * Price list. The "active" row swaps its price for a BOOK button
 * (Facial Treatments by default, exactly like the reference). Hover / focus moves it.
 */
export default function ServicesList() {
  const [active, setActive] = useState(defaultActiveService)
  const reset = () => setActive(defaultActiveService)

  return (
    <ul id="services" className="hero__list" onMouseLeave={reset} onBlur={reset} aria-label="خدمات و تعرفه‌ها">
      {services.map((s, i) => {
        const isActive = s.id === active
        return (
          <li key={s.id} className="service" style={{ ['--i' as string]: i }}>
            <a
              href="#book"
              className="service__row"
              data-active={isActive}
              onMouseEnter={() => setActive(s.id)}
              onFocus={() => setActive(s.id)}
            >
              <span className="service__label">{s.label}</span>
              <span className="service__end">
                <span className="service__price" aria-hidden={isActive}>
                  {s.price}
                  <small>{currency}</small>
                </span>
                <span className="service__book" aria-hidden={!isActive}>
                  {bookLabel}
                  <ArrowStart />
                </span>
              </span>
              <span className="sr-only">
                {`${s.price} ${currency}`}
                {isActive ? ` — ${bookLabel}` : ''}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
