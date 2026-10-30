import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroBackground from '../components/HeroBackground'
import { ArrowStart } from '../components/icons'
import { currency, manImage } from '../data/content'
import { useServices } from '../lib/useServices'
import ServiceGallery from '../components/ServiceGallery'
import '../services.css'

export default function ServicesPage() {
  const { services, details, images } = useServices()
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    // Only activate on mobile screens
    if (window.matchMedia('(min-width: 900px)').matches) return

    const items = listRef.current?.querySelectorAll<HTMLLIElement>('.sv__item')
    if (!items?.length) return

    const activate = () => {
      const mid = window.innerHeight / 2
      let closest: HTMLLIElement | null = null
      let closestDist = Infinity

      items.forEach((item) => {
        const rect = item.getBoundingClientRect()
        const visibleRatio = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
        // only consider items that are at least 70% visible
        if (visibleRatio / rect.height < 0.7) return
        const dist = Math.abs((rect.top + rect.bottom) / 2 - mid)
        if (dist < closestDist) { closestDist = dist; closest = item }
      })

      items.forEach((item) => {
        if (item === closest) item.dataset.active = 'true'
        else delete item.dataset.active
      })
    }

    window.addEventListener('scroll', activate, { passive: true })
    activate() // run once on mount
    return () => window.removeEventListener('scroll', activate)
  }, [services])

  return (
    <section className="hero hero--page hero--services" aria-labelledby="services-title">
      <HeroBackground />
      <Header />

      <div className="sv">
        <div className="sv__head">
          <h1 id="services-title" className="sv__title">خدمات</h1>
          <p className="sv__lead">از کوتاهی کلاسیک تا اصلاح با تیغ؛ هر خدمت با دقت، حوصله و محصولات خوب.</p>
          <picture className="sv__man" aria-hidden="true">
            <source srcSet={manImage.webp} type="image/webp" />
            <img
              src={manImage.png}
              alt=""
              width={manImage.width}
              height={manImage.height}
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>

        <ul className="sv__list" ref={listRef}>
          {services.map((s, i) => {
            const d = details[s.id]
            const gallery = images[s.id] ?? []
            return (
              <li
                key={s.id}
                className="sv__item"
                data-featured={d?.featured || undefined}
                style={{ ['--i' as string]: i }}
              >
                {/* ۱. اسلایدر عکس به عنوان فرزند مستقیم li (برای قرارگیری در ستون سمت راست) */}
                {gallery.length > 0 && (
                  <div className="sv__media">
                    <ServiceGallery images={gallery} label={s.label} />
                  </div>
                )}

                {/* ۲. متن‌ها */}
                <div className="sv__body">
                  <h2 className="sv__name">
                    {s.label}
                    {d?.featured && <span className="sv__badge">پیشنهاد ویژه</span>}
                  </h2>
                  {d && (
                    <>
                      <p className="sv__desc">{d.description}</p>
                      <ul className="sv__tags" aria-label="شامل">
                        {d.includes.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    </>
                  )}
                </div>

                {/* ۳. مدت و قیمت */}
                <dl className="sv__meta">
                  <div><dt>مدت</dt><dd>{d?.duration ?? '—'}</dd></div>
                  <div><dt>تعرفه</dt><dd className="sv__price">{s.price}<small>{currency}</small></dd></div>
                </dl>

                {/* ۴. دکمه رزرو */}
                <Link
                  to={`/book?service=${s.id}`}
                  className="sv__btn"
                  aria-label={`رزرو ${s.label}`}
                >
                  رزرو
                  <ArrowStart />
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="sv__cta">
          <p>نوبت خودتان را همین حالا رزرو کنید.</p>
          <Link to="/book" className="sv__btn sv__btn--lg">
            رزرو نوبت
            <ArrowStart />
          </Link>
        </div>
      </div>

      <Footer />
    </section>
  )
}
