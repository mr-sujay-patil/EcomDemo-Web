import type { ProductResponse } from './products'

// The shelf's filter, sort and page, as plain functions. The backend returns the whole catalogue,
// unsorted and unpaginated (web KI-003), and has no category list (KI-004), so all of this happens
// in the browser, on the one list the query cache holds.

export const PAGE_SIZE = 24

/** The group a product without a category falls into (web KI-004). */
export const OTHER = 'Other'

export const sortOptions = [
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'price', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
] as const

export type SortKey = (typeof sortOptions)[number]['value']

export type ShelfState = {
  /** null = every category */
  category: string | null
  sort: SortKey
  /** 1-based, as the URL says; `applyShelf` clamps it to the pages that exist */
  page: number
}

export const defaultShelf: ShelfState = { category: null, sort: 'name', page: 1 }

export function categoryOf(product: ProductResponse): string {
  return product.category?.trim() || OTHER
}

/** The filter's choices, derived from the products: alphabetical, with "Other" last. */
export function categoriesOf(products: readonly ProductResponse[]): string[] {
  const names = [...new Set(products.map(categoryOf))]
  return names.sort((a, b) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b, 'en')))
}

function isSortKey(value: string | null): value is SortKey {
  return sortOptions.some((option) => option.value === value)
}

/** Reads `?category=AUDIO&sort=price&page=2`. Anything unreadable falls back to the default. */
export function parseShelf(params: URLSearchParams): ShelfState {
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  return {
    category: params.get('category')?.trim() || null,
    sort: isSortKey(sort) ? sort : defaultShelf.sort,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** The inverse of `parseShelf`: a default is left out, so the plain shelf has a plain URL. */
export function toSearchParams(state: ShelfState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.category) params.set('category', state.category)
  if (state.sort !== defaultShelf.sort) params.set('sort', state.sort)
  if (state.page > 1) params.set('page', String(state.page))
  return params
}

function compare(sort: SortKey, a: ProductResponse, b: ProductResponse): number {
  const byName = a.name.localeCompare(b.name, 'en') || a.id - b.id
  if (sort === 'price') return a.price - b.price || byName
  if (sort === 'price-desc') return b.price - a.price || byName
  return byName
}

export type Shelf = {
  items: ProductResponse[]
  /** products matching the filter, across all pages */
  total: number
  /** the page actually shown, 1-based */
  page: number
  pageCount: number
  /** 1-based position of the first and last item shown (0 when there are none) */
  first: number
  last: number
}

export function applyShelf(products: readonly ProductResponse[], state: ShelfState): Shelf {
  const matching = products.filter((product) => state.category === null || categoryOf(product) === state.category)
  const sorted = [...matching].sort((a, b) => compare(state.sort, a, b))
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(state.page, pageCount)
  const start = (page - 1) * PAGE_SIZE
  const items = sorted.slice(start, start + PAGE_SIZE)
  return {
    items,
    total: sorted.length,
    page,
    pageCount,
    first: items.length === 0 ? 0 : start + 1,
    last: start + items.length,
  }
}

/** What the product page says about stock: a hint, not a promise (checkout still re-checks). */
export const LOW_STOCK_THRESHOLD = 5

export function stockHint(quantity: number): string {
  if (quantity <= 0) return 'Out of stock'
  if (quantity <= LOW_STOCK_THRESHOLD) return `Only ${quantity} left`
  return `${quantity} in stock`
}
