import { describe, expect, it } from 'vitest'
import { addLabel, LOW_STOCK, stockLevel, stockText } from './stock'

// Pure helpers taken out of ProductCard for web KI-038 (Sonar S3776); the card's own tests cover the rendering.
describe('stockLevel', () => {
  it('says nothing when the shelf did not send a stock', () => {
    expect(stockLevel(undefined)).toBe('none')
  })
  it('is out at zero, low up to LOW_STOCK, in above it', () => {
    expect(stockLevel(0)).toBe('out')
    expect(stockLevel(1)).toBe('low')
    expect(stockLevel(LOW_STOCK)).toBe('low')
    expect(stockLevel(LOW_STOCK + 1)).toBe('in')
  })
})

describe('stockText', () => {
  it('words each level', () => {
    expect(stockText('out', 0)).toBe('Out of stock')
    expect(stockText('low', 2)).toBe('Only 2 left')
    expect(stockText('in', 12)).toBe('12 in stock')
  })
})

describe('addLabel', () => {
  it('puts out of stock before what is already in the cart', () => {
    expect(addLabel(true, 3)).toBe('Out of stock')
    expect(addLabel(false, 3)).toBe('In your cart (3)')
    expect(addLabel(false, 0)).toBe('Add to cart')
  })
})
