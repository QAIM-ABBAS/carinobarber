/**
 * Typed client for the public catalogue of the "باشگاه جنتلمن‌ها" API:
 * the services, the availability and the booking creation.
 *
 * The transport lives in `apiCore.ts`, the customer endpoints in
 * `customerApi.ts` — both are re-exported here so every part of the app keeps
 * importing from this one module:
 *
 *   import { createBooking, ApiError, getMe } from '@/lib/api'
 *
 * Every failure of the API is an `ApiError` that carries the machine readable code
 * and the Persian message of the server.
 */

import { API_BASE, request } from './apiCore'

export { ApiError, setUnauthorizedHandler, API_BASE, API_PREFIX } from './apiCore'
export * from './customerApi'

/* ------------------------------------------------------------------ types */

export interface ApiService {
  id: string
  label: string
  description: string
  price: number
  duration_minutes: number
  includes: string[]
  images: string[]
  featured: boolean
}

export interface ApiSlot {
  time: string
  available: boolean
}

export interface ApiDay {
  date: string
  closed: boolean
  available: boolean
  slots: ApiSlot[]
}

export interface ApiAvailability {
  days: ApiDay[]
}

export interface ApiBookingService {
  id: string
  label: string
  price: number
}

export interface ApiBooking {
  code: string
  status: string
  service: ApiBookingService
  date: string
  time: string
  name: string
  phone: string
}

export interface CreateBookingInput {
  service_id: string
  date: string
  time: string
  name: string
}

/* -------------------------------------------------------------- requests */

/** The active services of the shop. */
export function fetchServices(): Promise<ApiService[]> {
  return request<ApiService[]>('/services')
}

/**
 * The absolute URL of an uploaded file.
 *
 * The API stores relative paths (`/api/v1/media/...`) so they keep working
 * behind the dev proxy and in docker; a cross-origin `VITE_API_URL` is prefixed.
 */
export function mediaUrl(path: string): string {
  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * The availability of the coming days.
 *
 * @param start first day (`YYYY-MM-DD`); the shop decides when it is omitted
 * @param days  number of days (max. 31)
 */
export function fetchAvailability(start?: string, days?: number): Promise<ApiAvailability> {
  const query = new URLSearchParams()
  if (start) query.set('start', start)
  if (days) query.set('days', String(days))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request<ApiAvailability>(`/availability${suffix}`)
}

/**
 * Create a booking for the logged-in customer.
 *
 * The phone is not part of the request: the server takes it from the customer
 * token, so a booking is always created for the account's phone.
 */
export function createBooking(input: CreateBookingInput): Promise<ApiBooking> {
  return request<ApiBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
