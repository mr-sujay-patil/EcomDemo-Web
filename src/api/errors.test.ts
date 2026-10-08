import { describe, expect, it } from 'vitest'
import { ApiError, parseRetryAfter, retryHint } from './errors'

describe('parseRetryAfter', () => {
  it('reads whole seconds', () => {
    expect(parseRetryAfter('30')).toBe(30)
    expect(parseRetryAfter(' 0 ')).toBe(0)
  })

  it('reads an HTTP date as the seconds from now', () => {
    const now = Date.parse('2026-10-01T10:00:00Z')

    expect(parseRetryAfter('Thu, 01 Oct 2026 10:00:45 GMT', now)).toBe(45)
    expect(parseRetryAfter('Thu, 01 Oct 2026 09:59:00 GMT', now)).toBe(0)
  })

  it('is undefined when absent or unreadable', () => {
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter('soon')).toBeUndefined()
  })
})

describe('retryHint', () => {
  const failure = (status: number, retryAfter?: number) =>
    new ApiError({ status, message: 'Down.', correlationId: null, ...(retryAfter === undefined ? {} : { retryAfter }) })

  it('says how long, in words, for a 503 that gave a time', () => {
    expect(retryHint(failure(503, 10))).toBe('Try again in about 10 seconds.')
    expect(retryHint(failure(503, 1))).toBe('Try again in about 1 second.')
  })

  it('never says zero seconds, and says minutes from a minute up', () => {
    expect(retryHint(failure(503, 0))).toBe('Try again in about 1 second.')
    expect(retryHint(failure(503, 60))).toBe('Try again in about 1 minute.')
    expect(retryHint(failure(503, 150))).toBe('Try again in about 3 minutes.')
  })

  it('has nothing to say without a time, for another status, or for something that is not an ApiError', () => {
    expect(retryHint(failure(503))).toBeNull()
    expect(retryHint(failure(429, 5))).toBeNull()
    expect(retryHint(failure(500, 5))).toBeNull()
    expect(retryHint(new Error('x'))).toBeNull()
  })
})
