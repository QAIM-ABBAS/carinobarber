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

import { clearSession, readSession, type AuthUser } from '../auth/storage'

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

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * Register the handler that runs when the API answers 401 — the customer token
 * is gone (expired or rejected) and the session ends everywhere at once.
 * The `AuthProvider` of the public app registers its `logout()` function.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // The bearer token of the logged-in customer is attached to every request.
  const session = readSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (session) headers.Authorization = `Bearer ${session.token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE}${API_PREFIX}${path}`, { ...init, headers })
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
    if (response.status === 401) {
      // An expired or rejected token never recovers by itself.
      clearSession()
      unauthorizedHandler?.()
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

/* ---------------------------------------------------------------- customer auth */

export type { AuthUser } from '../auth/storage'

/** The result of `POST /auth/otp/request`. */
export interface OtpRequestResult {
  /** Lifetime of the one-time code in seconds (e.g. 120). */
  expires_in: number
  /** Cooldown in seconds before a new code can be requested (e.g. 60). */
  resend_after: number
  /** True when this phone has no account yet — the client has to ask for a name. */
  is_new_user: boolean
  /** The plain code — ONLY present when the server runs with `OTP_DEV_MODE=true`. */
  dev_code?: string | null
}

/** The result of `POST /auth/otp/verify`. */
export interface OtpVerifyResult {
  access_token: string
  token_type: string
  /** Lifetime of the customer token in seconds (default 30 days). */
  expires_in: number
  user: AuthUser
}

export interface OtpVerifyInput {
  phone: string
  /** The 6-digit code (plain digits). */
  code: string
  /** Only needed for a phone without an account (2–100 characters). */
  name?: string
}

/** The customer profile as returned by `GET /me` and `PATCH /me`. */
export interface MeUser extends AuthUser {
  created_at?: string
}

export type MyBookingsScope = 'upcoming' | 'past' | 'all'

export interface MyBookingService {
  id: string
  label: string
}

/** One booking of the logged-in customer (`GET /me/bookings`). */
export interface MyBooking {
  code: string
  status: string
  service: MyBookingService
  /** `YYYY-MM-DD` (Gregorian, like everywhere in the API). */
  date: string
  /** `HH:mm`. */
  time: string
  name: string
  /** Price captured at the booking time (Toman). */
  price_at_booking: number
  /** Same rule as the public cancel endpoint: cancellable until it is too late. */
  can_cancel: boolean
  created_at: string
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

/* ------------------------------------------------- customer account requests */

/**
 * Ask for a new one-time code for a phone (`POST /auth/otp/request`).
 * In dev mode (`OTP_DEV_MODE=true`) the answer also carries the plain `dev_code`.
 */
export function requestOtp(phone: string): Promise<OtpRequestResult> {
  return request<OtpRequestResult>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

/** Check the one-time code and log the customer in (`POST /auth/otp/verify`). */
export function verifyOtp(input: OtpVerifyInput): Promise<OtpVerifyResult> {
  return request<OtpVerifyResult>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** The profile of the logged-in customer (`GET /me`). */
export function getMe(): Promise<MeUser> {
  return request<MeUser>('/me')
}

/** Change the name of the logged-in customer (`PATCH /me`). */
export function updateMe(name: string): Promise<MeUser> {
  return request<MeUser>('/me', { method: 'PATCH', body: JSON.stringify({ name }) })
}

/** The bookings of the logged-in customer, most recent first in the past scope. */
export function getMyBookings(scope: MyBookingsScope = 'all'): Promise<MyBooking[]> {
  return request<MyBooking[]>(`/me/bookings?scope=${scope}`)
}

/** Cancel one of the bookings of the logged-in customer. */
export function cancelMyBooking(code: string): Promise<MyBooking> {
  return request<MyBooking>(`/me/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST' })
}
