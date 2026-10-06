import { describe, expect, it } from 'vitest'
import { loginSchema, profileSchema, registerSchema } from './schemas'

const valid = { username: 'asha.rao', password: 'correct horse', fullName: 'Asha Rao' }

/** The message of the first problem with one field, or null when the value is accepted. */
function problem<Schema extends typeof registerSchema | typeof loginSchema | typeof profileSchema>(
  schema: Schema,
  values: Record<string, string>,
  field: string,
): string | null {
  const result = schema.safeParse(values)
  if (result.success) return null
  return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? null
}

describe('registerSchema', () => {
  it('accepts a good account, and gives back the same values', () => {
    expect(registerSchema.parse(valid)).toEqual(valid)
  })

  describe('username', () => {
    it.each([
      ['', 'Choose a username.'],
      ['ab', 'Use at least 3 characters.'],
      ['a'.repeat(51), 'Use at most 50 characters.'],
      ['asha rao', 'Use letters, digits, dots, underscores and hyphens only.'],
      ['asha@home', 'Use letters, digits, dots, underscores and hyphens only.'],
      ['ashá', 'Use letters, digits, dots, underscores and hyphens only.'],
    ])('rejects %j: %s', (value, message) => {
      expect(problem(registerSchema, { ...valid, username: value }, 'username')).toBe(message)
    })

    it.each(['abc', 'a'.repeat(50), 'A.b_c-9', '...', '123'])('accepts %j', (value) => {
      expect(problem(registerSchema, { ...valid, username: value }, 'username')).toBeNull()
    })
  })

  describe('password', () => {
    it.each([
      ['', 'Choose a password.'],
      ['1234567', 'Use at least 8 characters.'],
      ['a'.repeat(73), 'Use at most 72 characters.'],
      ['        ', 'A password cannot be only spaces.'],
    ])('rejects %j: %s', (value, message) => {
      expect(problem(registerSchema, { ...valid, password: value }, 'password')).toBe(message)
    })

    it.each(['12345678', 'a'.repeat(72), 'no digits or symbols needed', '  spaces at the edges  '])(
      'accepts %j',
      (value) => {
        expect(problem(registerSchema, { ...valid, password: value }, 'password')).toBeNull()
      },
    )

    it('is never trimmed', () => {
      expect(registerSchema.parse({ ...valid, password: '  padded  pass  ' }).password).toBe('  padded  pass  ')
    })
  })

  describe('fullName', () => {
    it.each([
      ['', 'Enter your name.'],
      ['   ', 'Enter your name.'],
      ['a'.repeat(101), 'Use at most 100 characters.'],
    ])('rejects %j: %s', (value, message) => {
      expect(problem(registerSchema, { ...valid, fullName: value }, 'fullName')).toBe(message)
    })

    it('accepts one name of 100 characters', () => {
      expect(problem(registerSchema, { ...valid, fullName: 'a'.repeat(100) }, 'fullName')).toBeNull()
    })

    it('is trimmed, and the trimmed name is what is sent', () => {
      expect(registerSchema.parse({ ...valid, fullName: '  Asha Rao  ' }).fullName).toBe('Asha Rao')
    })
  })

  it('reports every problem at once, one first message per field', () => {
    const result = registerSchema.safeParse({ username: '', password: '', fullName: '' })

    expect(result.success).toBe(false)
    const fields = new Set(result.error?.issues.map((issue) => issue.path[0]))
    expect(fields).toEqual(new Set(['username', 'password', 'fullName']))
  })
})

describe('loginSchema', () => {
  it('accepts anything filled in: the server judges whether it is right', () => {
    expect(loginSchema.parse({ username: 'a', password: 'x' })).toEqual({ username: 'a', password: 'x' })
  })

  it.each([
    ['username', 'Enter your username.'],
    ['password', 'Enter your password.'],
  ])('asks for the %s when it is empty or only spaces', (field, message) => {
    expect(problem(loginSchema, { username: 'a', password: 'x', [field]: '' }, field)).toBe(message)
    expect(problem(loginSchema, { username: 'a', password: 'x', [field]: '   ' }, field)).toBe(message)
  })
})

describe('profileSchema', () => {
  it('has the same name rule as registration', () => {
    expect(profileSchema.parse({ fullName: '  Asha Rao ' })).toEqual({ fullName: 'Asha Rao' })
    expect(problem(profileSchema, { fullName: '' }, 'fullName')).toBe('Enter your name.')
    expect(problem(profileSchema, { fullName: 'a'.repeat(101) }, 'fullName')).toBe('Use at most 100 characters.')
  })
})
