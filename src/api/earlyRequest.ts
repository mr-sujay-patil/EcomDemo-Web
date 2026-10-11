import { CORRELATION_HEADER } from './errors'

/**
 * What index.html's inline script leaves on `window.__ecomdemoEarly` on a product page (web KI-027): the product's GET, started
 * while the app's JavaScript is still downloading, so the photo at the end of the chain (page, data, photo) starts about a
 * second sooner. Same URL and headers as the app's own call (Accept, X-Correlation-Id; no token: a product read is public and a
 * fresh page has none). It has no `traceparent`, as the first call of any fresh page has none (tracing starts after the first
 * paint, web KI-033).
 */
export type EarlyRequest = {
  /** The path and query asked for, e.g. `/api/products/7`. */
  path: string
  /** The X-Correlation-Id it sent, or null when the browser had no `crypto.randomUUID` (then none was sent). */
  correlationId: string | null
  response: Promise<Response>
  /** Set when the app has taken it: it is used once. (Kept, not deleted, so a test can see that it was used.) */
  taken?: boolean
}

type Holder = { __ecomdemoEarly?: EarlyRequest }

/**
 * The early response for this request, once, or null. Only for the very same call: a GET to the same origin, path and query,
 * carrying no token (a signed-in call sends other headers), not already aborted. The request's X-Correlation-Id becomes the one
 * the early request really sent, so an error shows (and the logs hold) the id that reached the gateway.
 *
 * Everything after the response is the client's as usual: the middleware turns a 404 or 5xx into an `ApiError`, and the retry
 * policy retries an early request that failed at the network level (that retry is a real request).
 */
export function takeEarlyResponse(request: Request, holder: Holder = globalThis as Holder): Promise<Response> | null {
  const early = holder.__ecomdemoEarly
  if (!early || early.taken || request.method !== 'GET' || request.signal.aborted) return null
  if (request.headers.has('Authorization')) return null
  const url = new URL(request.url)
  if (typeof location === 'undefined' || url.origin !== location.origin || url.pathname + url.search !== early.path)
    return null

  early.taken = true
  if (early.correlationId) request.headers.set(CORRELATION_HEADER, early.correlationId)
  else request.headers.delete(CORRELATION_HEADER)
  return early.response
}
