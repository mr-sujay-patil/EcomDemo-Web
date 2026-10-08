import { describe, expect, it } from 'vitest'
import { productFixtures } from '@/test/msw/handlers'
import { filterCatalogue, MAX_QUERY_LENGTH, parseSearch, toSearchParams, type SearchState } from './search'

const none: SearchState = { q: '', category: null, minPrice: null, maxPrice: null }

describe('the search URL', () => {
  it('round-trips the query and every filter', () => {
    const state: SearchState = { q: 'something to type on', category: 'PERIPHERALS', minPrice: 500, maxPrice: 2500.5 }

    const url = toSearchParams(state).toString()

    expect(url).toBe('q=something+to+type+on&category=PERIPHERALS&minPrice=500&maxPrice=2500.5')
    expect(parseSearch(new URLSearchParams(url))).toEqual(state)
  })

  it('writes only what is set, so a plain search stays short', () => {
    expect(toSearchParams({ ...none, q: 'desk lamp' }).toString()).toBe('q=desk+lamp')
    expect(toSearchParams(none).toString()).toBe('')
  })

  it('trims the query and cuts it at the backend limit instead of failing', () => {
    expect(parseSearch(new URLSearchParams({ q: '  keyboard  ' })).q).toBe('keyboard')
    expect(parseSearch(new URLSearchParams({ q: 'x'.repeat(MAX_QUERY_LENGTH + 50) })).q).toHaveLength(MAX_QUERY_LENGTH)
  })

  it('drops a price that is negative, empty or not a number', () => {
    const parsed = parseSearch(new URLSearchParams({ q: 'a', minPrice: '-5', maxPrice: 'cheap' }))
    expect(parsed.minPrice).toBeNull()
    expect(parsed.maxPrice).toBeNull()
    expect(parseSearch(new URLSearchParams({ q: 'a', minPrice: '' })).minPrice).toBeNull()
    expect(parseSearch(new URLSearchParams({ q: 'a', minPrice: '0' })).minPrice).toBe(0)
  })
})

describe('filterCatalogue (the fallback)', () => {
  it('needs every word in the name or the description, in any case', () => {
    expect(filterCatalogue(productFixtures, { ...none, q: 'KETTLE' }).map((p) => p.name)).toEqual(['Test Kettle'])
    expect(filterCatalogue(productFixtures, { ...none, q: 'fixture sofa' }).map((p) => p.name)).toEqual(['Test Sofa'])
    expect(filterCatalogue(productFixtures, { ...none, q: 'kettle sofa' })).toEqual([])
  })

  it('keeps the catalogue order', () => {
    expect(filterCatalogue(productFixtures, { ...none, q: 'fixture' }).map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('applies the category (any case) and the price bounds, inclusive', () => {
    expect(filterCatalogue(productFixtures, { ...none, q: 'fixture', category: 'kitchen' }).map((p) => p.id)).toEqual([
      1,
    ])
    expect(
      filterCatalogue(productFixtures, { ...none, q: 'fixture', minPrice: 500, maxPrice: 1299 }).map((p) => p.id),
    ).toEqual([1, 3])
    expect(filterCatalogue(productFixtures, { ...none, q: 'fixture', minPrice: 1300 }).map((p) => p.id)).toEqual([2])
  })
})
