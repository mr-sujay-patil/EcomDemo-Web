/**
 * Every failed call, whatever the cause, reaches the app as one of these.
 *
 * - `status`: the HTTP status, or 0 when there was no response at all (the network, a dead gateway).
 * - `message`: the backend's own `message` when it sent one (safe to show), otherwise a generic sentence.
 * - `correlationId`: the response's `X-Correlation-Id`, else the id this app sent; a 5xx screen shows it.
 * - `retryAfter`: seconds from the `Retry-After` header, when there was one (login throttling, rate limits).
 */
export class ApiError extends Error {
  readonly status: number
  readonly correlationId: string | null
  readonly retryAfter?: number

  constructor(init: { status: number; message: string; correlationId: string | null; retryAfter?: number }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.correlationId = init.correlationId
    if (init.retryAfter !== undefined) this.retryAfter = init.retryAfter
  }
}

export const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.'

export const CORRELATION_HEADER = 'X-Correlation-Id'

/** `Retry-After` is whole seconds or an HTTP date; this returns seconds, or undefined when it is absent or unreadable. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | undefined {
  if (value === null) return undefined
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const date = Date.parse(trimmed)
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000))
}

function hasMessage(body: unknown): body is { message: string } {
  return typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
}

/** Builds the ApiError for a non-2xx response from the backend's `{status, message}` body and its headers. */
export async function apiErrorFromResponse(response: Response, sentCorrelationId: string | null): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  return new ApiError({
    status: response.status,
    message: hasMessage(body) ? body.message : `The server could not complete the request (HTTP ${response.status}).`,
    correlationId: response.headers.get(CORRELATION_HEADER) ?? sentCorrelationId,
    retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
  })
}

/**
 * The id to show beside an error so support can find it, or null when it would not help: a server or
 * network failure has one worth quoting; for a 4xx the message already says enough.
 */
export function supportReference(error: unknown): string | null {
  const shown = error instanceof ApiError && (error.status === 0 || error.status >= 500)
  return shown ? (error.correlationId ?? null) : null
}

/**
 * What to tell a shopper when the server is busy or down and said when to come back: "Try again in about 10 seconds."
 * Only for a 503 that carries `Retry-After` (the catalogue's circuit breaker, a checkout that was shed); null otherwise.
 * A minute or more is said in minutes. Never the status code: the voice rules keep numbers like 503 out of the screen.
 */
export function retryHint(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 503 || error.retryAfter === undefined) return null
  const seconds = Math.max(1, Math.round(error.retryAfter))
  if (seconds < 60) return `Try again in about ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`
  const minutes = Math.round(seconds / 60)
  return `Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
}
