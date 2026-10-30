import { useState } from 'react'
import { Link } from 'react-router-dom'
import { bookLabel, currency, defaultActiveService } from '../data/content'
import { useServices } from '../lib/useServices'
import { ArrowStart } from './icons'

/**
 * Price list with simple hover effect.
 * Reserve and services buttons are shown after the list.
 */
export default function ServicesList() {
  const { services } = useServices()
  const [active, setActive] = useState(defaultActiveService)

  return (
    <div>
      <ul id="services" className="hero__list" aria-label="خدمات و تعرفه‌ها">
        {services.map((s, i) => {
          return (
            <li key={s.id} className="service" style={{ ['--i' as string]: i }}>
              <div className="service__row">
                <span className="service__label">{s.label}</span>
                <span className="service__end">
                  <span className="service__price">
                    {s.price}
                    <small>{currency}</small>
                  </span>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="service__btns">
        <Link to="/services" className="service__btn service__btn--services">
          خدمات
        </Link>
        <Link to={`/book?service=${active}`} className="service__btn service__btn--book">
          {bookLabel}
          <ArrowStart />
        </Link>
      </div>
    </div>
  )
}
