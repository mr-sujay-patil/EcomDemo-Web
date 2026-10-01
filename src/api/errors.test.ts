import { describe, expect, it } from 'vitest'
import { parseRetryAfter } from './errors'

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
