import { describe, expect, it } from 'vitest'
import { productSchema, toRequest, toValues } from './schemas'

const valid = { name: 'Mechanical Keyboard', description: '', price: '8999.50', stockQuantity: '25', category: '' }
const messages = (values: object) => {
  const result = productSchema.safeParse({ ...valid, ...values })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('the product rules', () => {
  it('accepts a valid product', () => {
    expect(productSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    [{ name: '   ' }, 'Enter a name.'],
    [{ name: 'x'.repeat(256) }, 'Use at most 255 characters.'],
    [{ description: 'x'.repeat(1001) }, 'Use at most 1000 characters.'],
    [{ category: 'x'.repeat(51) }, 'Use at most 50 characters.'],
    [{ price: '' }, 'Enter a price.'],
    [{ price: '0' }, 'The price must be at least 0.01.'],
    [{ price: '10.999' }, 'Use rupees with at most two decimals, like 8999.50.'],
    [{ price: '-5' }, 'Use rupees with at most two decimals, like 8999.50.'],
    [{ stockQuantity: '' }, 'Enter a stock level, 0 or more.'],
    [{ stockQuantity: '-1' }, 'Use a whole number, 0 or more.'],
    [{ stockQuantity: '2.5' }, 'Use a whole number, 0 or more.'],
    [{ stockQuantity: '99999999999' }, 'That number is too large.'],
  ])('refuses %j with a sentence', (values, message) => {
    expect(messages(values)).toContain(message)
  })

  it('allows a price of 0.01, a stock of 0 and a missing category', () => {
    expect(productSchema.safeParse({ ...valid, price: '0.01', stockQuantity: '0' }).success).toBe(true)
  })

  it('builds the request: trimmed, numbers as numbers, an empty category left out', () => {
    expect(toRequest({ ...valid, name: '  Keyboard ' })).toEqual({
      name: 'Keyboard',
      description: '',
      price: 8999.5,
      stockQuantity: 25,
    })
    expect(toRequest({ ...valid, category: ' PERIPHERALS ' }).category).toBe('PERIPHERALS')
  })

  it('fills a form from a product, and an empty form from nothing', () => {
    expect(toValues({ name: 'A', description: 'd', price: 10, stockQuantity: 3, category: null })).toEqual({
      name: 'A',
      description: 'd',
      price: '10',
      stockQuantity: '3',
      category: '',
    })
    expect(toValues()).toEqual({ name: '', description: '', price: '', stockQuantity: '', category: '' })
  })
})
