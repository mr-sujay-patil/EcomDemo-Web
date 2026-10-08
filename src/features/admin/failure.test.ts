import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { failureOf } from './failure'

describe('failureOf', () => {
  it("uses the server's sentence and keeps the support reference", () => {
    const error = new ApiError({ status: 500, message: 'Down', correlationId: 'abc-123456789' })
    expect(failureOf(error, 'fallback')).toEqual({ message: 'Down', reference: 'abc-123456789' })
  })

  it('uses the screen’s own sentence for anything else', () => {
    expect(failureOf('boom', 'It did not work.')).toEqual({ message: 'It did not work.', reference: null })
  })
})
