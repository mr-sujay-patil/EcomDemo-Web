import { ApiError } from '@/api/errors'

/**
 * The reference a shopper can quote when something broke, and a developer can search for.
 *
 * - A failed call has one: the `X-Correlation-Id` this app sent and the gateway echoed. It is in the gateway's log line
 *   (Loki) and ties to the trace (Tempo): docs/troubleshooting.md.
 * - A failure that is not a call (a render error, a bug) has no request to find. It gets a fresh id, written to the
 *   browser console with the error itself, so the reference still leads somewhere: the console of the person who saw it.
 */
export function referenceFor(error: unknown): string {
  if (error instanceof ApiError && error.correlationId) return error.correlationId
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `local-${Date.now().toString(36)}`
}

/** Writes the failure and its reference to the console, once per call: this is the developer's side of the page. */
export function reportError(error: unknown, reference: string) {
  // The console is this function's whole job.
  // eslint-disable-next-line no-console
  console.error(`[reference ${reference}]`, error)
}
