import { supportReference } from '@/api/errors'

/** What a screen shows when a call fails: the server's sentence, and the id support can look up in the logs. */
export type Failure = { message: string; reference: string | null }

/** An `ApiError` carries the server's sentence; anything else gets the screen's own `fallback`. */
export function failureOf(error: unknown, fallback: string): Failure {
  return { message: error instanceof Error ? error.message : fallback, reference: supportReference(error) }
}
