import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  VERIFY_ANSWER,
  fetchMock,
  flush,
  makeRouter,
  pickServiceAndSlot,
  renderBooking,
  resetFetchEnvironment,
  restoreFetchEnvironment,
} from './bookingTestHarness'

beforeEach(() => {
  resetFetchEnvironment()
})

afterEach(() => {
  restoreFetchEnvironment()
})

describe('BookingPage (customer accounts)', () => {
  it('a logged-out visitor verifies a code, is logged in and the booking is created', async () => {
    const router = makeRouter({ bookingFailures: 0 })
    const loginMock = renderBooking()
    await pickServiceAndSlot()
    fireEvent.change(screen.getByLabelText('نام و نام خانوادگی'), {
      target: { value: 'فرهاد کریمی' },
    })
    // Persian digits on purpose — the input is normalized.
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '۰۹۱۲۱۲۳۴۰۹۹' } })
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush()

    // The form area became the verification step; the summary aside stays.
    expect(screen.getByText(/کد ۶ رقمی به شماره/)).toBeTruthy()
    expect(screen.getByText('حالت آزمایشی — پیامک فعال نیست. کد شما:')).toBeTruthy()
    expect(screen.getByText('۶۵۴۳۲۱')).toBeTruthy()
    expect(router.seen.otpRequests).toBe(1)
    const otpInit = fetchMock.mock.calls.find(([u]) => String(u).includes('/otp/request'))?.[1]
    expect(JSON.parse(String(otpInit?.body))).toEqual({ phone: '09121234099' })

    // Entering the code verifies it, logs the visitor in, creates the booking.
    fireEvent.change(screen.getByLabelText('کد تأیید ۶ رقمی'), { target: { value: '۱۲۳۴۵۶' } })
    await flush()

    expect(router.seen.otpVerifies).toBe(1)
    expect(router.seen.bookings).toBe(1)
    expect(loginMock).toHaveBeenCalledWith('tok-1', VERIFY_ANSWER.user, 2592000)
    const bookingCalls = fetchMock.mock.calls.filter(
      ([u, i]) => String(u).includes('/bookings') && (i as RequestInit).method === 'POST',
    )
    expect(bookingCalls).toHaveLength(1)
    const body = JSON.parse(String((bookingCalls[0][1] as RequestInit).body))
    // The phone is NEVER part of the payload — the token carries it.
    expect(body).toEqual({
      service_id: 'haircut',
      date: '2027-05-10',
      time: '10:30',
      name: 'فرهاد کریمی',
    })

    // The success screen with the follow-up to the account page.
    expect(screen.getByText('نوبت شما ثبت شد')).toBeTruthy()
    expect(screen.getByText('09121234099')).toBeTruthy()
    expect(screen.getByText('مشاهده نوبت‌ها در حساب من')).toBeTruthy()
    expect(router.seen.otpRequests).toBe(1) // no second code for the booking itself
  })

  it('slot_taken after verification returns to step 3, reloads it and keeps the session', async () => {
    const router = makeRouter({ bookingFailures: 1 })
    const loginMock = renderBooking()
    await pickServiceAndSlot()
    fireEvent.change(screen.getByLabelText('نام و نام خانوادگی'), { target: { value: 'فرهاد کریمی' } })
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '09121234099' } })
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush() // the code request resolves and the verify step replaces the form
    fireEvent.change(screen.getByLabelText('کد تأیید ۶ رقمی'), { target: { value: '123456' } })
    await flush()

    expect(router.seen.otpVerifies).toBe(1)
    expect(loginMock).toHaveBeenCalledTimes(1)
    // The server message is shown and the availability was reloaded once more.
    expect(screen.getByText('این ساعت پیش‌تر رزرو شده؛ لطفاً ساعت دیگری را انتخاب کنید.')).toBeTruthy()
    expect(router.seen.availability).toBe(2)
    // Back on the form (step 3) with the time unselected.
    expect(screen.getByText('ثبت نوبت')).toBeTruthy()
    expect((screen.getByRole('radio', { name: '۱۰:۳۰' }) as HTMLInputElement).checked).toBe(false)

    // Pick another slot and submit again — signed in, so WITHOUT a second code.
    fireEvent.click(screen.getByText('۱۰:۳۰'))
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush()

    expect(router.seen.otpRequests).toBe(1)
    expect(router.seen.bookings).toBe(2)
    expect(screen.getByText('نوبت شما ثبت شد')).toBeTruthy()
  })

  it('«ویرایش شماره» goes back to the form with every selection kept', async () => {
    const router = makeRouter({ bookingFailures: 0 })
    renderBooking()
    await pickServiceAndSlot()
    fireEvent.change(screen.getByLabelText('نام و نام خانوادگی'), { target: { value: 'فرهاد کریمی' } })
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '09121234099' } })
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush()

    fireEvent.click(screen.getByText('ویرایش شماره'))

    const slotRadio = screen.getByRole('radio', { name: '۱۰:۳۰' }) as HTMLInputElement
    expect(slotRadio.checked).toBe(true)
    expect((screen.getByLabelText('نام و نام خانوادگی') as HTMLInputElement).value).toBe('فرهاد کریمی')
    expect((screen.getByLabelText('شماره موبایل') as HTMLInputElement).value).toBe('09121234099')

    // A new submit asks for a fresh code (the old one was invalidated).
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush()
    expect(router.seen.otpRequests).toBe(2)
    expect(screen.getByText(/کد ۶ رقمی به شماره/)).toBeTruthy()
  })

  it('a logged-in visitor has his name/phone prefilled and books without any code', async () => {
    const router = makeRouter({ bookingFailures: 0 })
    renderBooking({ id: 'usr-2', name: 'امیرحسین کاشانی', phone: '09121110000' })
    await flush()

    expect((screen.getByLabelText('نام و نام خانوادگی') as HTMLInputElement).value).toBe(
      'امیرحسین کاشانی',
    )
    expect(screen.getByText(/شماره شما:/)).toBeTruthy()
    expect(screen.getByText('۰۹۱۲۱۱۱۰۰۰۰')).toBeTruthy()
    expect(screen.queryByLabelText('شماره موبایل')).toBeNull()

    await pickServiceAndSlot()
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush()

    expect(router.seen.otpRequests).toBe(0)
    expect(router.seen.bookings).toBe(1)
    const bookingCalls = fetchMock.mock.calls.filter(
      ([u, i]) => String(u).includes('/bookings') && (i as RequestInit).method === 'POST',
    )
    expect(JSON.parse(String((bookingCalls[0][1] as RequestInit).body)).name).toBe('امیرحسین کاشانی')
    expect(screen.getByText('نوبت شما ثبت شد')).toBeTruthy()
    expect(screen.getByText('مشاهده نوبت‌ها در حساب من')).toBeTruthy()
  })

  it('an invalid phone number stops the flow client-side before any request', async () => {
    const router = makeRouter({ bookingFailures: 0 })
    renderBooking()
    await pickServiceAndSlot()
    fireEvent.change(screen.getByLabelText('نام و نام خانوادگی'), { target: { value: 'فرهاد کریمی' } })
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '1212345' } })
    fireEvent.click(screen.getByText('ثبت نوبت'))
    await flush()

    expect(screen.getByText('شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).')).toBeTruthy()
    // Still on the form — no code was requested and nothing was booked.
    expect(screen.queryByText(/کد ۶ رقمی به شماره/)).toBeNull()
    expect(router.seen.otpRequests).toBe(0)
    expect(router.seen.bookings).toBe(0)
  })
})
