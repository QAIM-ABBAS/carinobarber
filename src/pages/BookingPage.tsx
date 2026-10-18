import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import HeroBackground from '../components/HeroBackground'
import { ArrowStart } from '../components/icons'
import { currency, manImage, services, type Service } from '../data/content'
import {
  formatTime,
  getBookableDays,
  getSlots,
  normalizePhone,
  submitBooking,
  type BookableDay,
} from '../lib/booking'
import '../booking.css'

type Errors = Partial<Record<'service' | 'time' | 'name' | 'phone', string>>

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

interface SummaryProps {
  service?: Service
  day?: BookableDay
  time: string | null
  className?: string
}

function Summary({ service, day, time, className = '' }: SummaryProps) {
  const rows: [string, string | undefined][] = [
    ['خدمت', service?.label],
    ['روز', day && !day.closed ? day.full : undefined],
    ['ساعت', time ? formatTime(time) : undefined],
  ]
  return (
    <div className={`summary ${className}`} aria-live="polite">
      <h2 className="summary__title">خلاصه نوبت</h2>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="summary__row">
            <dt>{k}</dt>
            <dd data-empty={!v}>{v ?? '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="summary__total">
        <span>مبلغ</span>
        <strong>
          {service ? service.price : '—'}
          {service && <small>{currency}</small>}
        </strong>
      </div>
    </div>
  )
}

export default function BookingPage() {
  const [params] = useSearchParams()
  const days = useMemo(() => getBookableDays(14), [])

  const initialService = services.find((s) => s.id === params.get('service'))?.id ?? null
  const [serviceId, setServiceId] = useState<string | null>(initialService)
  const [dayIso, setDayIso] = useState<string>(() => days.find((d) => d.available)?.iso ?? days[0].iso)
  const [time, setTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [code, setCode] = useState('')
  const [failed, setFailed] = useState(false)

  const service = services.find((s) => s.id === serviceId)
  const day = days.find((d) => d.iso === dayIso)
  const slots = useMemo(() => (day ? getSlots(day) : []), [day])

  const validate = (): Errors => {
    const e: Errors = {}
    if (!service) e.service = 'لطفاً یک خدمت انتخاب کنید.'
    if (!time) e.time = 'لطفاً ساعت نوبت را انتخاب کنید.'
    if (name.trim().length < 2) e.name = 'نام و نام خانوادگی را وارد کنید.'
    if (!normalizePhone(phone)) e.phone = 'شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).'
    return e
  }

  const focusFirst = (e: Errors) => {
    const id = e.service ? 'step-service' : e.time ? 'step-time' : e.name ? 'field-name' : 'field-phone'
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return focusFirst(e)

    setStatus('submitting')
    setFailed(false)
    try {
      const res = await submitBooking({
        serviceId: service!.id,
        date: dayIso,
        time: time!,
        name: name.trim(),
        phone: normalizePhone(phone)!,
      })
      setCode(res.code)
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setFailed(true)
      setStatus('idle')
    }
  }

  const reset = () => {
    setServiceId(null)
    setTime(null)
    setName('')
    setPhone('')
    setErrors({})
    setStatus('idle')
  }

  const clear = (k: keyof Errors) => setErrors((prev) => ({ ...prev, [k]: undefined }))

  return (
    <section className="hero hero--page" aria-labelledby="book-title">
      <HeroBackground />
      <Header />

      <div className="book">
        <div className="book__head">
          <h1 id="book-title" className="book__title">
            {status === 'done' ? 'نوبت شما ثبت شد' : 'رزرو نوبت'}
          </h1>
          <p className="book__lead">
            {status === 'done'
              ? 'منتظر دیدنتان در باشگاه هستیم.'
              : 'خدمت، روز و ساعت دلخواهتان را انتخاب کنید؛ بقیه‌اش با ما.'}
          </p>
        </div>

        <div className="book__grid">
          {status === 'done' ? (
            <div className="done">
              <span className="done__badge">
                <CheckIcon />
              </span>
              <dl className="done__list">
                <div><dt>کد پیگیری</dt><dd className="done__code">{code}</dd></div>
                <div><dt>خدمت</dt><dd>{service?.label}</dd></div>
                <div><dt>زمان</dt><dd>{day?.full}، ساعت {time && formatTime(time)}</dd></div>
                <div><dt>نام</dt><dd>{name.trim()}</dd></div>
                <div><dt>موبایل</dt><dd dir="ltr" className="done__ltr">{normalizePhone(phone)}</dd></div>
              </dl>
              <div className="done__actions">
                <Link to="/" className="btn">
                  بازگشت به صفحه اصلی
                  <ArrowStart />
                </Link>
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  ثبت نوبت جدید
                </button>
              </div>
            </div>
          ) : (
            <form className="book__form" onSubmit={onSubmit} noValidate>
              {/* 1 — service */}
              <fieldset className="step" id="step-service" tabIndex={-1} aria-describedby={errors.service ? 'err-service' : undefined}>
                <legend><span className="step__n">۱</span>انتخاب خدمت</legend>
                <div className="opts">
                  {services.map((s) => (
                    <label key={s.id} className="opt">
                      <input
                        type="radio"
                        name="service"
                        value={s.id}
                        checked={serviceId === s.id}
                        onChange={() => {
                          setServiceId(s.id)
                          clear('service')
                        }}
                      />
                      <span className="opt__body">
                        <span className="opt__dot" aria-hidden="true" />
                        <span className="opt__label">{s.label}</span>
                        <span className="opt__price">
                          {s.price}
                          <small>{currency}</small>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.service && <p className="err" id="err-service" role="alert">{errors.service}</p>}
              </fieldset>

              {/* 2 — day */}
              <fieldset className="step">
                <legend><span className="step__n">۲</span>انتخاب روز</legend>
                <div className="days">
                  {days.map((d) => (
                    <label key={d.iso} className="day">
                      <input
                        type="radio"
                        name="day"
                        value={d.iso}
                        disabled={!d.available}
                        checked={dayIso === d.iso}
                        onChange={() => {
                          setDayIso(d.iso)
                          setTime(null)
                        }}
                      />
                      <span className="day__body">
                        <span className="day__wd">{d.weekday}</span>
                        <span className="day__n">{d.day}</span>
                        <span className="day__m">{d.closed ? 'تعطیل' : !d.available ? 'تکمیل' : d.month}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 3 — time */}
              <fieldset className="step" id="step-time" tabIndex={-1} aria-describedby={errors.time ? 'err-time' : undefined}>
                <legend><span className="step__n">۳</span>انتخاب ساعت</legend>
                {day?.closed ? (
                  <p className="muted">این روز باشگاه تعطیل است؛ روز دیگری را انتخاب کنید.</p>
                ) : (
                  <div className="slots">
                    {slots.map((s) => (
                      <label key={s.time} className="slot">
                        <input
                          type="radio"
                          name="time"
                          value={s.time}
                          disabled={s.disabled}
                          checked={time === s.time}
                          onChange={() => {
                            setTime(s.time)
                            clear('time')
                          }}
                        />
                        <span className="slot__body">{formatTime(s.time)}</span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.time && <p className="err" id="err-time" role="alert">{errors.time}</p>}
              </fieldset>

              {/* 4 — contact */}
              <fieldset className="step">
                <legend><span className="step__n">۴</span>مشخصات شما</legend>
                <div className="fields">
                  <div className="field">
                    <label htmlFor="field-name">نام و نام خانوادگی</label>
                    <input
                      id="field-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        clear('name')
                      }}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'err-name' : undefined}
                    />
                    {errors.name && <p className="err" id="err-name" role="alert">{errors.name}</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="field-phone">شماره موبایل</label>
                    <input
                      id="field-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        clear('phone')
                      }}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? 'err-phone' : undefined}
                    />
                    {errors.phone && <p className="err" id="err-phone" role="alert">{errors.phone}</p>}
                  </div>
                </div>
              </fieldset>

              <Summary service={service} day={day} time={time} className="summary--inline" />

              {failed && <p className="err err--box" role="alert">ثبت نوبت انجام نشد. لطفاً دوباره تلاش کنید.</p>}

              <button type="submit" className="btn btn--submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'در حال ثبت…' : 'ثبت نوبت'}
                {status !== 'submitting' && <ArrowStart />}
              </button>
            </form>
          )}

          <aside className="book__aside" aria-label="خلاصه رزرو">
            <picture className="book__man" aria-hidden="true">
              <source srcSet={manImage.webp} type="image/webp" />
              <img src={manImage.png} alt="" width={manImage.width} height={manImage.height} decoding="async" draggable={false} />
            </picture>
            {status !== 'done' && <Summary service={service} day={day} time={time} className="summary--aside" />}
          </aside>
        </div>
      </div>
    </section>
  )
}
