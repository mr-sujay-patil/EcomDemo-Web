import { catalogApi } from '@/api/client'
import type { components } from '@/api/generated/catalog'
import type { ProductResponse } from '@/features/catalog/products'

export type ProductSearchResponse = components['schemas']['ProductSearchResponse']

/** The backend's limit on `q` (integration guide). */
export const MAX_QUERY_LENGTH = 200
/** The most the endpoint returns (`limit` 1-20). The results page asks for all it can show. */
export const RESULTS_LIMIT = 20
export const SUGGESTION_LIMIT = 5

/** What the URL holds: `/search?q=…&category=…&minPrice=…&maxPrice=…`. A missing filter is `null`. */
export type SearchState = {
  q: string
  category: string | null
  minPrice: number | null
  maxPrice: number | null
}

function parsePrice(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const price = Number(value)
  // The backend refuses a negative price with a 400; a link that carries one just has no price filter.
  return Number.isFinite(price) && price >= 0 ? price : null
}

/** Reads the URL into a state. Anything unusable (a negative price, a query over the limit) is dropped or cut, never an error. */
export function parseSearch(params: URLSearchParams): SearchState {
  const category = params.get('category')?.trim()
  return {
    q: (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    category: category ? category : null,
    minPrice: parsePrice(params.get('minPrice')),
    maxPrice: parsePrice(params.get('maxPrice')),
  }
}

/** The URL for a state: only what is set, so `/search?q=keyboard` stays short and shareable. */
export function toSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.category) params.set('category', state.category)
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  return params
}

/**
 * GET /api/products/search. Results come back best match first, each with a `similarity`: the app keeps the order and
 * shows no number. Rejects with an `ApiError`; status 503 means search by meaning is not available (no embedding model, or it did not answer).
 */
export async function searchProducts(
  state: SearchState,
  limit: number,
  signal?: AbortSignal,
): Promise<ProductResponse[]> {
  const { data } = await catalogApi.GET('/api/products/search', {
    params: {
      query: {
        q: state.q,
        limit,
        ...(state.category ? { category: state.category } : {}),
        ...(state.minPrice !== null ? { minPrice: state.minPrice } : {}),
        ...(state.maxPrice !== null ? { maxPrice: state.maxPrice } : {}),
      },
    },
    signal,
  })
  return (data?.results ?? []).map((hit) => hit.product)
}

/**
 * The fallback when search by meaning is off: the loaded catalogue, filtered by words. Every word of the query must appear
 * in the name or the description (any case), then the same category and price filters apply. The catalogue's own order is kept.
 */
export function filterCatalogue(products: readonly ProductResponse[], state: SearchState): ProductResponse[] {
  const words = state.q.toLowerCase().split(/\s+/).filter(Boolean)
  return products.filter((product) => {
    const text = `${product.name} ${product.description}`.toLowerCase()
    if (!words.every((word) => text.includes(word))) return false
    if (state.category && (product.category ?? '').toLowerCase() !== state.category.toLowerCase()) return false
    if (state.minPrice !== null && product.price < state.minPrice) return false
    if (state.maxPrice !== null && product.price > state.maxPrice) return false
    return true
  })
}
