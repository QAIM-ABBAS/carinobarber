/**
 * The state and the validation of the service form.
 *
 * The slug is immutable: the API rejects a body that contains it, so the update
 * sends every other field only.
 */

export interface ServiceFormState {
  label: string
  slug: string
  description: string
  price: string
  duration: string
  includes: string[]
  featured: boolean
  is_active: boolean
  sort_order: string
}

export type ServiceFormErrors = Partial<Record<keyof ServiceFormState, string>>

/** The empty form of a new service. */
export const EMPTY_SERVICE_FORM: ServiceFormState = {
  label: '',
  slug: '',
  description: '',
  price: '',
  duration: '',
  includes: [],
  featured: false,
  is_active: true,
  sort_order: '0',
}

/** The slug of a service: lower case letters, digits and dashes. */
export const SLUG_PATTERN = /^[a-z0-9-]{2,50}$/

/** The form of an existing service (the values come from the API). */
export function serviceToForm(service: {
  label: string
  slug: string
  description: string
  price: number
  duration_minutes: number
  includes: string[]
  featured: boolean
  is_active: boolean
  sort_order: number
}): ServiceFormState {
  return {
    label: service.label,
    slug: service.slug,
    description: service.description,
    price: String(service.price),
    duration: String(service.duration_minutes),
    includes: service.includes,
    featured: service.featured,
    is_active: service.is_active,
    sort_order: String(service.sort_order),
  }
}

/** The name of the form field of a field error of the API. */
export const SERVICE_FIELD_NAMES: Record<string, keyof ServiceFormState> = {
  slug: 'slug',
  label: 'label',
  description: 'description',
  price: 'price',
  duration_minutes: 'duration',
  includes: 'includes',
  featured: 'featured',
  is_active: 'is_active',
  sort_order: 'sort_order',
}

/** Check the form and return the errors of every field. */
export function validateServiceForm(
  form: ServiceFormState,
  isNew: boolean,
): ServiceFormErrors {
  const errors: ServiceFormErrors = {}
  if (form.label.trim().length < 1) errors.label = 'نام خدمت را بنویسید.'
  if (isNew && !SLUG_PATTERN.test(form.slug)) {
    errors.slug = 'شناسه باید ۲ تا ۵۰ نویسهٔ لاتین کوچک، رقم یا خط تیره باشد.'
  }
  if (form.description.trim().length < 1) errors.description = 'توضیح خدمت را بنویسید.'
  const price = Number(form.price)
  if (form.price.trim() === '' || Number.isNaN(price) || price < 0) {
    errors.price = 'قیمت باید یک عدد صحیح و بزرگ‌تر یا مساوی صفر باشد.'
  }
  const duration = Number(form.duration)
  if (form.duration.trim() === '' || Number.isNaN(duration) || duration <= 0) {
    errors.duration = 'مدت زمان باید بزرگ‌تر از صفر باشد.'
  }
  const order = Number(form.sort_order)
  if (form.sort_order.trim() === '' || Number.isNaN(order) || order < 0) {
    errors.sort_order = 'ترتیب باید یک عدد صحیح و بزرگ‌تر یا مساوی صفر باشد.'
  }
  return errors
}
