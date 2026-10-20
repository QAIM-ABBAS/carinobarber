import { Link } from 'react-router-dom'
import Header from '../components/Header'
import HeroBackground from '../components/HeroBackground'
import { ArrowStart } from '../components/icons'
import { currency, manImage } from '../data/content'
import { useServices } from '../lib/useServices'
import '../services.css'

const faIndex = (n: number) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

export default function ServicesPage() {
  const { services, details } = useServices()

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
            <img src={manImage.png} alt="" width={manImage.width} height={manImage.height} decoding="async" draggable={false} />
          </picture>
        </div>

        <ul className="sv__list">
          {services.map((s, i) => {
            const d = details[s.id]
            return (
              <li key={s.id} className="sv__item" data-featured={d?.featured || undefined} style={{ ['--i' as string]: i }}>
                <span className="sv__num" aria-hidden="true">{faIndex(i + 1)}</span>

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

                <dl className="sv__meta">
                  <div><dt>مدت</dt><dd>{d?.duration ?? '—'}</dd></div>
                  <div><dt>تعرفه</dt><dd className="sv__price">{s.price}<small>{currency}</small></dd></div>
                </dl>

                <Link to={`/book?service=${s.id}`} className="sv__btn" aria-label={`رزرو ${s.label}`}>
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
    </section>
  )
}
