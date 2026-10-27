/**
 * The customer account client — the OTP login of «حساب کاربری» and the
 * endpoints behind the session: the profile and the own bookings.
 *
 * The transport and the error type come from `apiCore.ts`. The server may
 * serialize the numeric primary key as a JSON number; every profile answer is
 * normalized here so the session always stores `id` as a string.
 */

import type { AuthUser } from '../auth/storage'
import { request, type ApiError } from './apiCore'

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

/** Normalizes the returned profile — the server may serialize `id` as a number. */
function normalizeUser(user: AuthUser): AuthUser {
  const normalized: AuthUser = { id: String(user.id), name: user.name, phone: user.phone }
  return user.is_admin === true ? { ...normalized, is_admin: true } : normalized
}

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
export async function verifyOtp(input: OtpVerifyInput): Promise<OtpVerifyResult> {
  const answer = await request<OtpVerifyResult>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return { ...answer, user: normalizeUser(answer.user) }
}

/** The profile of the logged-in customer (`GET /me`). */
export async function getMe(): Promise<MeUser> {
  const me = await request<MeUser>('/me')
  return { ...me, id: String(me.id) }
}

/** Change the name of the logged-in customer (`PATCH /me`). */
export async function updateMe(name: string): Promise<MeUser> {
  const me = await request<MeUser>('/me', { method: 'PATCH', body: JSON.stringify({ name }) })
  return { ...me, id: String(me.id) }
}

/** The bookings of the logged-in customer, most recent first in the past scope. */
export function getMyBookings(scope: MyBookingsScope = 'all'): Promise<MyBooking[]> {
  return request<MyBooking[]>(`/me/bookings?scope=${scope}`)
}

/** Cancel one of the bookings of the logged-in customer. */
export function cancelMyBooking(code: string): Promise<MyBooking> {
  return request<MyBooking>(`/me/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST' })
}

export type { ApiError }
