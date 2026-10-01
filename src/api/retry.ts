import { parseRetryAfter } from './errors'

/** The one place that decides what is retried, and when (integration guide, "Errors" and section 4). */
const NETWORK_RETRY_DELAY_MS = 500
const RATE_LIMIT_DEFAULT_DELAY_MS = 1000
/** A longer `Retry-After` than this is not waited out inside a request: the 429 goes to the caller, with `retryAfter`. */
const MAX_WAIT_MS = 5000

type Fetch = (request: Request) => Promise<Response>

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Wraps fetch with the retry policy:
 *
 * - Only a GET is ever retried, and only once. Every other method goes through untouched: a lost
 *   response to a POST does not mean nothing happened, and POST /api/orders in particular must never
 *   be replayed (the guide re-reads GET /api/orders first).
 * - A GET that fails at the network level is retried once after a short pause.
 * - A GET answered 429 is retried once, after the `Retry-After` the server gave (default one second).
 * - Nothing else is retried: not other 4xx, not 5xx, not an aborted request.
 */
export function createRetryingFetch({
  fetch: send = (request) => fetch(request),
  sleep = realSleep,
}: { fetch?: Fetch; sleep?: (ms: number) => Promise<void> } = {}): Fetch {
  return async (request) => {
    if (request.method !== 'GET') return send(request)

    // A Request body can be read once; a GET has none, but the copy is what the retry sends.
    const again = request.clone()
    let response: Response
    try {
      response = await send(request)
    } catch (error) {
      if (request.signal.aborted) throw error
      await sleep(NETWORK_RETRY_DELAY_MS)
      return send(again)
    }

    if (response.status !== 429) return response
    const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
    const delay = retryAfter === undefined ? RATE_LIMIT_DEFAULT_DELAY_MS : retryAfter * 1000
    if (delay > MAX_WAIT_MS) return response
    await sleep(delay)
    return send(again)
  }
}
