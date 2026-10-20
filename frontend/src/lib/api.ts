/**
 * Typed client for the "باشگاه جنتلمن‌ها" API.
 *
 * The base URL comes from `VITE_API_URL`:
 *   - empty (default) → the requests use the relative `/api/v1/...` path and the Vite
 *     dev proxy forwards them to the backend.
 *   - set (e.g. `VITE_API_URL=http://localhost:8000`) → the requests go straight to
 *     the backend.
 *
 * Every failure of the API is an `ApiError` that carries the machine readable code
 * and the Persian message of the server.
 */

const RAW_BASE = String(import.meta.env.VITE_API_URL ?? '').trim()

/** Base URL of the API without a trailing slash (empty → same origin). */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

/** Version prefix of every endpoint. */
export const API_PREFIX = '/api/v1'

const NETWORK_ERROR_MESSAGE = 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.'
const SERVER_UNAVAILABLE_MESSAGE = 'سرور در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.'
const GENERIC_ERROR_MESSAGE = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, 'network_error', NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    let code = 'error'
    let message = GENERIC_ERROR_MESSAGE
    let details: unknown = null
    try {
      const body = (await response.json()) as ErrorEnvelope
      if (body?.error?.code) code = body.error.code
      if (body?.error?.message) message = body.error.message
      details = body?.error?.details ?? null
    } catch {
      // The body is not JSON — keep the generic message.
    }
    if (response.status >= 502) {
      code = 'server_unavailable'
      message = SERVER_UNAVAILABLE_MESSAGE
    }
    throw new ApiError(response.status, code, message, details)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/* ------------------------------------------------------------------ types */

export interface ApiService {
  id: string
  label: string
  description: string
  price: number
  duration_minutes: number
  includes: string[]
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
  phone: string
}

/* -------------------------------------------------------------- requests */

/** The active services of the shop. */
export function fetchServices(): Promise<ApiService[]> {
  return request<ApiService[]>('/services')
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

/** Create a booking. */
export function createBooking(input: CreateBookingInput): Promise<ApiBooking> {
  return request<ApiBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
