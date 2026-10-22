/**
 * The validation of the manual booking form.
 *
 * The rules mirror the ones of the public booking form (`src/lib/booking.ts`): the
 * phone number accepts the Persian and the Arabic-Indic digits and the name needs
 * at least two characters.
 */

import { normalizePhone } from '../../lib/booking'

export type BookingFormField = 'service' | 'date' | 'time' | 'name' | 'phone' | 'form'

export type BookingFormErrors = Partial<Record<BookingFormField, string>>

export interface BookingFormInput {
  serviceId: string
  date: string
  time: string
  name: string
  phone: string
}

/** The state of the manual booking form. */
export interface BookingFormState extends BookingFormInput {
  status: 'confirmed' | 'pending'
  note: string
}

/** The empty form of a new booking. */
export const EMPTY_BOOKING_FORM: BookingFormState = {
  serviceId: '',
  date: '',
  time: '',
  name: '',
  phone: '',
  status: 'confirmed',
  note: '',
}

/** Check the form and return the errors of every field. */
export function validateBookingForm(input: BookingFormInput): BookingFormErrors {
  const errors: BookingFormErrors = {}
  if (!input.serviceId) errors.service = 'یک خدمت انتخاب کنید.'
  if (!input.date) errors.date = 'تاریخ نوبت را انتخاب کنید.'
  if (!input.time) errors.time = 'ساعت نوبت را انتخاب کنید.'
  if (input.name.trim().length < 2) errors.name = 'نام و نام خانوادگی را وارد کنید.'
  if (!normalizePhone(input.phone)) {
    errors.phone = 'شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).'
  }
  return errors
}
