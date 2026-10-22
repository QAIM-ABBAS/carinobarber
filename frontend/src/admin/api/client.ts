/**
 * The typed client of the admin API.
 *
 * The base URL comes from `VITE_API_URL`:
 *   - empty (default) → the requests use the relative `/api/v1/...` path and the Vite
 *     dev proxy forwards them to the backend.
 *   - set → the requests go straight to the backend.
 *
 * Every failure of the API is an `ApiError` that carries the machine readable code
 * and the Persian message of the server.
 */

import type { FieldError } from './types'

const RAW_BASE = String(import.meta.env.VITE_API_URL ?? '').trim()

/** The base URL of the API without a trailing slash (empty → same origin). */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

/** The version prefix of every endpoint. */
export const API_PREFIX = '/api/v1'

export const NETWORK_ERROR_MESSAGE =
  'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.'
export const SERVER_ERROR_MESSAGE = 'سرور در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.'
export const GENERIC_ERROR_MESSAGE = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

/** The error of every failing request. */
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

  /** The field errors of a 422 (empty when the error is not a field error). */
  get fieldErrors(): FieldError[] {
    if (!Array.isArray(this.details)) return []
    return this.details.filter(
      (item): item is FieldError =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as FieldError).field === 'string' &&
        typeof (item as FieldError).message === 'string',
    )
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  /** The bearer token of the admin (the login request does not need one). */
  token?: string | null
  signal?: AbortSignal
  /**
   * Set to `false` to skip the global 401 handler. The login endpoint answers 401
   * for a wrong password and must not log the admin out.
   */
  handleUnauthorized?: boolean
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** Register the handler that is called when the API answers 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

/** Build the query string of a request (empty values are skipped). */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }
  const search = query.toString()
  return search ? `?${search}` : ''
}

/**
 * Send a request to the API and return the parsed body.
 *
 * @throws {ApiError} for every failure (network, HTTP status and a malformed body).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal, handleUnauthorized = true } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network_error', NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    let code = 'error'
    let message = GENERIC_ERROR_MESSAGE
    let details: unknown = null
    try {
      const payload = (await response.json()) as ErrorEnvelope
      if (payload?.error?.code) code = payload.error.code
      if (payload?.error?.message) message = payload.error.message
      details = payload?.error?.details ?? null
    } catch {
      // The body is not JSON — keep the generic message.
    }
    if (response.status >= 502) {
      code = 'server_unavailable'
      message = SERVER_ERROR_MESSAGE
    }
    if (response.status === 401 && handleUnauthorized) {
      unauthorizedHandler?.()
    }
    throw new ApiError(response.status, code, message, details)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
