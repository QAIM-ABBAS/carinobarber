/**
 * The transport of the public API client.
 *
 * The base URL comes from `VITE_API_URL`:
 *   - empty (default) → the requests use the relative `/api/v1/...` path and the Vite
 *     dev proxy forwards them to the backend.
 *   - set (e.g. `VITE_API_URL=http://localhost:8000`) → the requests go straight to
 *     the backend.
 *
 * Both clients (`api.ts` — public catalogue, `customerApi.ts` — customer account)
 * send their requests through the `request()` of this module. Every failure is an
 * `ApiError` carrying the machine readable code and the Persian message of the
 * unified error envelope (`{error:{code,message,details}}`).
 */

import { clearSession, readSession } from '../auth/storage'

const RAW_BASE = String(import.meta.env.VITE_API_URL ?? '').trim()

/** Base URL of the API without a trailing slash (empty → same origin). */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

/** Version prefix of every endpoint. */
export const API_PREFIX = '/api/v1'

const NETWORK_ERROR_MESSAGE = 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.'
const SERVER_UNAVAILABLE_MESSAGE = 'سرور در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.'
const GENERIC_ERROR_MESSAGE = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

/** Every failure of the API — with the code and the Persian message of the server. */
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

/**
 * Send one API request with the customer bearer token attached. Internal helper
 * of the public clients — the endpoints live in `api.ts` and `customerApi.ts`.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
