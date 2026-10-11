import { describe, expect, it } from 'vitest'
import {
  addLine,
  countGuestItems,
  guestQuantity,
  markSent,
  MAX_LINES,
  MAX_QUANTITY,
  parseGuestCart,
  removeLine,
  serializeGuestCart,
  setLineQuantity,
  takeLine,
} from './guestCart'

const lines = [
  { productId: 1, quantity: 2 },
  { productId: 3, quantity: 1 },
]

describe('reading the guest cart from storage', () => {
  it('reads nothing stored as an empty cart', () => {
    expect(parseGuestCart(null)).toEqual([])
  })

  it('reads what it wrote, marks included', () => {
    const marked = markSent(lines, 3, { over: 2, quantity: 1 })
    expect(parseGuestCart(serializeGuestCart(lines))).toEqual(lines)
    expect(parseGuestCart(serializeGuestCart(marked))).toEqual(marked)
  })

  it('keeps only the known fields of a line', () => {
    const raw = JSON.stringify({
      items: [{ productId: 1, quantity: 2, price: 1, sent: { over: 0, quantity: 2, note: 'x' } }],
      token: 'x',
    })
    expect(parseGuestCart(raw)).toEqual([{ productId: 1, quantity: 2, sent: { over: 0, quantity: 2 } }])
  })

  it.each([
    ['not JSON', '{items'],
    ['JSON null', 'null'],
    ['a number', '42'],
    ['no items', '{}'],
    ['items not a list', '{"items":{}}'],
    ['a line that is not an object', '{"items":[1]}'],
    ['a null line', '{"items":[null]}'],
    ['an id of 0', '{"items":[{"productId":0,"quantity":1}]}'],
    ['an id that is text', '{"items":[{"productId":"1","quantity":1}]}'],
    ['a fractional id', '{"items":[{"productId":1.5,"quantity":1}]}'],
    ['a quantity of 0', '{"items":[{"productId":1,"quantity":0}]}'],
    ['a quantity above the limit', `{"items":[{"productId":1,"quantity":${MAX_QUANTITY + 1}}]}`],
    ['a fractional quantity', '{"items":[{"productId":1,"quantity":1.5}]}'],
    ['a product twice', '{"items":[{"productId":1,"quantity":1},{"productId":1,"quantity":2}]}'],
    ['a mark that is not an object', '{"items":[{"productId":1,"quantity":1,"sent":true}]}'],
    ['a null mark', '{"items":[{"productId":1,"quantity":1,"sent":null}]}'],
    ['a negative mark', '{"items":[{"productId":1,"quantity":1,"sent":{"over":-1,"quantity":1}}]}'],
    ['a mark without a quantity', '{"items":[{"productId":1,"quantity":1,"sent":{"over":0}}]}'],
  ])('discards %s', (_what, raw) => {
    expect(parseGuestCart(raw)).toBeUndefined()
  })

  it('discards more lines than a cart can hold', () => {
    const many = Array.from({ length: MAX_LINES + 1 }, (_, index) => ({ productId: index + 1, quantity: 1 }))
    expect(parseGuestCart(serializeGuestCart(many))).toBeUndefined()
  })
})

describe('changing the guest cart', () => {
  it('adds a new product last, and one more of a product already there', () => {
    expect(addLine(lines, 7)).toEqual([...lines, { productId: 7, quantity: 1 }])
    expect(addLine(lines, 1, 3)).toEqual([{ productId: 1, quantity: 5 }, lines[1]])
  })

  it('keeps a quantity between 1 and the limit', () => {
    expect(addLine([{ productId: 1, quantity: MAX_QUANTITY }], 1)).toEqual([{ productId: 1, quantity: MAX_QUANTITY }])
    expect(setLineQuantity(lines, 1, 0)).toEqual([{ productId: 1, quantity: 1 }, lines[1]])
    expect(setLineQuantity(lines, 1, 500)).toEqual([{ productId: 1, quantity: MAX_QUANTITY }, lines[1]])
  })

  it('takes no new product into a full cart, but still adds to a line in it', () => {
    const full = Array.from({ length: MAX_LINES }, (_, index) => ({ productId: index + 1, quantity: 1 }))
    expect(addLine(full, 999)).toEqual(full)
    expect(guestQuantity(addLine(full, 1), 1)).toBe(2)
  })

  it('removes a line, and leaves a cart without that product as it is', () => {
    expect(removeLine(lines, 1)).toEqual([lines[1]])
    expect(setLineQuantity(lines, 9, 4)).toEqual(lines)
  })

  it('takes out what the server accepted, keeping anything added meanwhile without a mark', () => {
    const marked = markSent(lines, 1, { over: 0, quantity: 2 })
    expect(takeLine(marked, 1, 2)).toEqual([lines[1]])
    expect(takeLine(markSent([{ productId: 1, quantity: 3 }], 1, { over: 0, quantity: 2 }), 1, 2)).toEqual([
      { productId: 1, quantity: 1 },
    ])
  })

  it('keeps a mark when the quantity changes', () => {
    const marked = markSent(lines, 1, { over: 4, quantity: 2 })
    expect(addLine(marked, 1)[0]).toEqual({ productId: 1, quantity: 3, sent: { over: 4, quantity: 2 } })
  })

  it('counts items, not lines', () => {
    expect(countGuestItems(lines)).toBe(3)
    expect(countGuestItems([])).toBe(0)
    expect(guestQuantity(lines, 3)).toBe(1)
    expect(guestQuantity(lines, 9)).toBe(0)
  })
})
