import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroBackground from '../components/HeroBackground'
import BookingVerifyCard from '../components/BookingVerifyCard'
import { ArrowStart } from '../components/icons'
import { currency, manImage, type Service } from '../data/content'
import { ApiError, requestOtp, type OtpRequestResult, type OtpVerifyResult } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import {
  formatTime,
  getBookableDays,
  getSlots,
  normalizePhone,
  submitBooking,
  toFaDigits,
  type BookableDay,
} from '../lib/booking'
import { useServices } from '../lib/useServices'
import '../booking.css'

type Errors = Partial<Record<'service' | 'time' | 'name' | 'phone', string>>

/** The booking flow states: form → (logged out) code request → verify → create. */
type SubmitStatus = 'idle' | 'submitting' | 'requesting' | 'otp' | 'creating' | 'done'

/** Errors that mean the availability changed and the days have to be reloaded. */
const RELOAD_AVAILABILITY = new Set([
  'slot_taken',
  'slot_in_past',
  'date_out_of_range',
  'day_closed',
  'invalid_time',
])

const GENERIC_ERROR = 'ثبت نوبت انجام نشد. لطفاً دوباره تلاش کنید.'
const DAYS_ERROR = 'دریافت روزهای آزاد ممکن نشد. لطفاً دوباره تلاش کنید.'

const STEP_LABELS = ['خدمت', 'روز', 'ساعت', 'مشخصات']
const STEP_PERCENTS = [50, 66, 83, 100]
const TOTAL_STEPS = 4

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

interface ProgressBarProps {
  current: number // 1-indexed
  total: number
  labels: string[]
  percents: number[]
}

function ProgressBar({ current, total, labels, percents }: ProgressBarProps) {
  return (
    <nav className="progress" aria-label="مراحل رزرو">
      <ol className="progress__steps">
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <li
              key={step}
              className="progress__step"
              data-done={done || undefined}
              data-active={active || undefined}
              aria-current={active ? 'step' : undefined}
            >
              <span className="progress__dot">
                {done ? <CheckIcon /> : <span>{percents[i]}٪</span>}
              </span>
              <span className="progress__label">{labels[i]}</span>
            </li>
          )
        })}
      </ol>
    </nav>
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
  const { user, login } = useAuth()
  const { services } = useServices()
  const [days, setDays] = useState<BookableDay[]>([])
  const [daysLoading, setDaysLoading] = useState(true)
  const [daysError, setDaysError] = useState<string | null>(null)

  const initialService = services.find((s) => s.id === params.get('service'))?.id ?? null
  const [serviceId, setServiceId] = useState<string | null>(initialService)
  const [dayIso, setDayIso] = useState<string>('')
  const [time, setTime] = useState<string | null>(null)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [code, setCode] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [otpPhone, setOtpPhone] = useState('')
  const [otpInitial, setOtpInitial] = useState<OtpRequestResult | null>(null)

  // Current wizard step: 1 = service, 2 = day, 3 = time, 4 = contact
  const [currentStep, setCurrentStep] = useState(1)

  const service = services.find((s) => s.id === serviceId)
  const day = days.find((d) => d.iso === dayIso)
  const slots = useMemo(() => (day ? getSlots(day) : []), [day])

  const loadDays = useCallback(async () => {
    setDaysLoading(true)
    try {
      const loaded = await getBookableDays(14)
      setDays(loaded)
      setDaysError(null)
      setDayIso((current) => {
        if (current && loaded.some((d) => d.iso === current)) return current
        const first = loaded.find((d) => d.available) ?? loaded[0]
        return first ? first.iso : ''
      })
    } catch (err) {
      setDaysError(err instanceof ApiError ? err.message : DAYS_ERROR)
    } finally {
      setDaysLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDays()
  }, [loadDays])

  // Scroll to top when switching steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1))

  const validateStep = (step: number): Errors => {
    const e: Errors = {}
    if (step === 1 && !service) e.service = 'لطفاً یک خدمت انتخاب کنید.'
    if (step === 3 && !time) e.time = 'لطفاً ساعت نوبت را انتخاب کنید.'
    if (step === 4) {
      if (name.trim().length < 2) e.name = 'نام و نام خانوادگی را وارد کنید.'
      if (!user && !normalizePhone(phone)) e.phone = 'شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).'
    }
    return e
  }

  const handleNext = () => {
    const e = validateStep(currentStep)
    setErrors(e)
    if (Object.keys(e).length) return
    goNext()
  }

  const finishBooking = async () => {
    try {
      const res = await submitBooking({
        serviceId: service!.id,
        date: dayIso,
        time: time!,
        name: name.trim(),
      })
      setCode(toFaDigits(res.code))
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : GENERIC_ERROR)
      if (err instanceof ApiError && RELOAD_AVAILABILITY.has(err.code)) {
        setTime(null)
        void loadDays()
        setCurrentStep(3)
      }
      setStatus('idle')
    }
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (status !== 'idle') return
    const e = validateStep(4)
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitError(null)

    if (user) {
      setStatus('submitting')
      await finishBooking()
      return
    }

    const normalized = normalizePhone(phone)!
    setStatus('requesting')
    try {
      const initial = await requestOtp(normalized)
      setOtpPhone(normalized)
      setOtpInitial(initial)
      setStatus('otp')
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : GENERIC_ERROR)
      setStatus('idle')
    }
  }

  const onVerified = (result: OtpVerifyResult) => {
    login(result.access_token, result.user, result.expires_in)
    setOtpInitial(null)
    setOtpPhone('')
    setSubmitError(null)
    setStatus('creating')
    void finishBooking()
  }

  const backToForm = () => setStatus('idle')

  const reset = () => {
    setServiceId(null)
    setTime(null)
    setName(user?.name ?? '')
    setPhone('')
    setErrors({})
    setSubmitError(null)
    setOtpInitial(null)
    setOtpPhone('')
    setStatus('idle')
    setCurrentStep(1)
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
                <div><dt>موبایل</dt><dd dir="ltr" className="done__ltr">{user?.phone ?? normalizePhone(phone) ?? ''}</dd></div>
              </dl>
              <div className="done__actions">
                <Link to="/" className="btn">
                  بازگشت به صفحه اصلی
                  <ArrowStart />
                </Link>
                {user && (
                  <Link to="/account" className="btn">
                    مشاهده نوبت‌ها در حساب من
                  </Link>
                )}
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  ثبت نوبت جدید
                </button>
              </div>
            </div>
          ) : status === 'otp' || status === 'creating' ? (
            <BookingVerifyCard
              phone={otpPhone}
              initial={otpInitial}
              name={name.trim()}
              creating={status === 'creating'}
              onVerified={onVerified}
              onBack={backToForm}
            />
          ) : (
            <div className="book__wizard">
              <ProgressBar current={currentStep} total={TOTAL_STEPS} labels={STEP_LABELS} percents={STEP_PERCENTS} />

              <form className="book__form" onSubmit={onSubmit} noValidate>

                {/* Step 1 — service */}
                {currentStep === 1 && (
                  <fieldset className="step" id="step-service">
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
                )}

                {/* Step 2 — day */}
                {currentStep === 2 && (
                  <fieldset className="step">
                    {daysLoading ? (
                      <p className="muted">در حال دریافت روزهای آزاد…</p>
                    ) : daysError ? (
                      <p className="err err--box" role="alert">
                        {daysError}{' '}
                        <button type="button" className="btn btn--ghost" onClick={() => void loadDays()}>
                          تلاش دوباره
                        </button>
                      </p>
                    ) : (
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
                    )}
                  </fieldset>
                )}

                {/* Step 3 — time */}
                {currentStep === 3 && (
                  <fieldset className="step" id="step-time">
                    {daysLoading ? (
                      <p className="muted">در حال دریافت ساعت‌های آزاد…</p>
                    ) : day?.closed ? (
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
                )}

                {/* Step 4 — contact */}
                {currentStep === 4 && (
                  <fieldset className="step">
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
                      {user ? (
                        <div className="field">
                          <span className="book__phone">شماره شما: <bdi dir="ltr">{toFaDigits(user.phone)}</bdi></span>
                          <p className="book__hint">این شماره از حساب شما عنوان می‌شود؛ ثبت نوبت بدون کد تأیید انجام می‌شود.</p>
                        </div>
                      ) : (
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
                      )}
                    </div>

                    <Summary service={service} day={day} time={time} className="summary--inline" />
                    {submitError && <p className="err err--box" role="alert">{submitError}</p>}
                  </fieldset>
                )}

                {/* Navigation buttons */}
                <div className="step__nav">
                  {currentStep > 1 && (
                    <button type="button" className="btn btn--ghost" onClick={goBack}>
                      بازگشت
                    </button>
                  )}
                  {currentStep < TOTAL_STEPS ? (
                    <button type="button" className="btn btn--next" onClick={handleNext}>
                      مرحله بعد
                      <ArrowStart />
                    </button>
                  ) : (
                    <button type="submit" className="btn btn--submit" disabled={status !== 'idle'}>
                      {status === 'submitting' ? 'در حال ثبت…' : status === 'requesting' ? 'در حال ارسال کد…' : 'ثبت نوبت'}
                      {status === 'idle' && <ArrowStart />}
                    </button>
                  )}
                </div>

              </form>
            </div>
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

      <Footer />
    </section>
  )
}
