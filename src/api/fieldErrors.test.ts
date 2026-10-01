import { describe, expect, it } from 'vitest'
import { splitFieldErrors } from './fieldErrors'

const registerFields = ['username', 'password', 'fullName'] as const

describe('splitFieldErrors', () => {
  it('puts each part beside the field it starts with', () => {
    const result = splitFieldErrors(
      'fullName must not be blank; password must be between 8 and 72 characters',
      registerFields,
    )

    expect(result.fields).toEqual({
      fullName: 'fullName must not be blank',
      password: 'password must be between 8 and 72 characters',
    })
    expect(result.other).toEqual([])
  })

  it('sends a part that names no known field to `other`', () => {
    const result = splitFieldErrors('username must not be blank; something else went wrong', registerFields)

    expect(result.fields).toEqual({ username: 'username must not be blank' })
    expect(result.other).toEqual(['something else went wrong'])
  })

  it('matches whole field names only', () => {
    const result = splitFieldErrors('password must be between 8 and 72 characters', ['pass'])

    expect(result.fields).toEqual({})
    expect(result.other).toEqual(['password must be between 8 and 72 characters'])
  })

  it('keeps every sentence when one field has several', () => {
    const result = splitFieldErrors('username size must be between 3 and 50; username must match the pattern', [
      'username',
    ])

    expect(result.fields.username).toBe('username size must be between 3 and 50; username must match the pattern')
  })

  it('copes with a single message and with an empty one', () => {
    expect(splitFieldErrors('Product 42 not found', registerFields)).toEqual({
      fields: {},
      other: ['Product 42 not found'],
    })
    expect(splitFieldErrors('', registerFields)).toEqual({ fields: {}, other: [] })
  })
})
