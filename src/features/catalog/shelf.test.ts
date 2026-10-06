import { describe, expect, it } from 'vitest'
import { manyProducts } from '@/test/msw/handlers'
import type { ProductResponse } from './products'
import {
  applyShelf,
  categoriesOf,
  categoryOf,
  defaultShelf,
  OTHER,
  PAGE_SIZE,
  parseShelf,
  stockHint,
  toSearchParams,
} from './shelf'

const product = (id: number, name: string, price: number, category: string | null): ProductResponse => ({
  id,
  name,
  description: '',
  price,
  stockQuantity: 1,
  category,
  imageUrl: null,
})

const products = [
  product(1, 'Kettle', 1299, 'Kitchen'),
  product(2, 'Amp', 500, 'Audio'),
  product(3, 'Gift Card', 500, null),
  product(4, 'Blender', 2500, 'Kitchen'),
]

describe('parseShelf and toSearchParams', () => {
  it('reads category, sort and page from the URL', () => {
    expect(parseShelf(new URLSearchParams('category=AUDIO&sort=price&page=2'))).toEqual({
      category: 'AUDIO',
      sort: 'price',
      page: 2,
    })
  })

  it('falls back to the defaults for anything unreadable', () => {
    expect(parseShelf(new URLSearchParams(''))).toEqual(defaultShelf)
    expect(parseShelf(new URLSearchParams('sort=colour&page=0&category='))).toEqual(defaultShelf)
    expect(parseShelf(new URLSearchParams('page=abc'))).toEqual(defaultShelf)
    expect(parseShelf(new URLSearchParams('page=1.5'))).toEqual(defaultShelf)
    expect(parseShelf(new URLSearchParams('page=-3'))).toEqual(defaultShelf)
  })

  it('writes only what differs from the default, so the plain shelf has a plain URL', () => {
    expect(toSearchParams(defaultShelf).toString()).toBe('')
    expect(toSearchParams({ category: 'Home & Garden', sort: 'price-desc', page: 3 }).toString()).toBe(
      'category=Home+%26+Garden&sort=price-desc&page=3',
    )
  })

  it('round-trips', () => {
    const state = { category: 'Home & Garden', sort: 'price' as const, page: 2 }

    expect(parseShelf(toSearchParams(state))).toEqual(state)
  })
})

describe('categories', () => {
  it('derives the filter list from the products: alphabetical, "Other" last, no duplicates', () => {
    expect(categoriesOf(products)).toEqual(['Audio', 'Kitchen', OTHER])
  })

  it('groups a missing or blank category as "Other"', () => {
    expect(categoryOf(product(9, 'x', 1, null))).toBe(OTHER)
    expect(categoryOf(product(9, 'x', 1, '  '))).toBe(OTHER)
  })
})

describe('applyShelf', () => {
  it('filters by category, with null grouped as "Other"', () => {
    expect(applyShelf(products, { ...defaultShelf, category: 'Kitchen' }).items.map((p) => p.name)).toEqual([
      'Blender',
      'Kettle',
    ])
    expect(applyShelf(products, { ...defaultShelf, category: OTHER }).items.map((p) => p.name)).toEqual(['Gift Card'])
  })

  it('sorts by name, by price ascending and by price descending, breaking ties by name', () => {
    const names = (sort: 'name' | 'price' | 'price-desc') =>
      applyShelf(products, { ...defaultShelf, sort }).items.map((p) => p.name)

    expect(names('name')).toEqual(['Amp', 'Blender', 'Gift Card', 'Kettle'])
    expect(names('price')).toEqual(['Amp', 'Gift Card', 'Kettle', 'Blender'])
    expect(names('price-desc')).toEqual(['Blender', 'Kettle', 'Amp', 'Gift Card'])
  })

  it('paginates 24 to a page', () => {
    const all = manyProducts(30)

    const first = applyShelf(all, defaultShelf)
    const second = applyShelf(all, { ...defaultShelf, page: 2 })

    expect(PAGE_SIZE).toBe(24)
    expect(first).toMatchObject({ total: 30, page: 1, pageCount: 2, first: 1, last: 24 })
    expect(first.items).toHaveLength(24)
    expect(second).toMatchObject({ page: 2, first: 25, last: 30 })
    expect(second.items.map((p) => p.name)).toEqual(['Item 25', 'Item 26', 'Item 27', 'Item 28', 'Item 29', 'Item 30'])
  })

  it('clamps a page past the end to the last page', () => {
    expect(applyShelf(manyProducts(30), { ...defaultShelf, page: 99 })).toMatchObject({ page: 2, first: 25 })
  })

  it('has one empty page when nothing matches', () => {
    expect(applyShelf(products, { ...defaultShelf, category: 'Nope' })).toMatchObject({
      items: [],
      total: 0,
      page: 1,
      pageCount: 1,
      first: 0,
      last: 0,
    })
  })

  it('does not change the list it is given', () => {
    const before = products.map((p) => p.id)

    applyShelf(products, { ...defaultShelf, sort: 'price-desc' })

    expect(products.map((p) => p.id)).toEqual(before)
  })
})

describe('stockHint', () => {
  it.each([
    [0, 'Out of stock'],
    [-2, 'Out of stock'],
    [1, 'Only 1 left'],
    [5, 'Only 5 left'],
    [6, '6 in stock'],
    [18, '18 in stock'],
  ])('%i reads "%s"', (quantity, hint) => {
    expect(stockHint(quantity)).toBe(hint)
  })
})
