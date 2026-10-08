import { catalogApi } from '@/api/client'
import type { components } from '@/api/generated/catalog'

export type ProductResponse = components['schemas']['ProductResponse']

/** The backend's largest page (`size` above it is a 400). */
export const CATALOG_PAGE_SIZE = 100
/** A guard, not a limit anyone should meet: 100 pages of 100 is 10,000 products. It stops a header that never says "last". */
const MAX_PAGES = 100

/**
 * GET /api/products, **every page**. The backend pages the catalogue (50 by default, 100 at most, in id order, with the total in
 * `X-Total-Count` and the next page in `Link`; backend KI-007), but the shelf sorts and filters the whole catalogue by name, price
 * and category in the browser, and the server can only order by id: so all pages are read, one request each, and joined.
 * A catalogue that fits in one page (the seed has 14 products) costs one request, as before.
 *
 * A reply with neither header is an unpaged backend (the one before Phase 34's successor): it already sent everything, so there
 * is nothing to follow. Rejects with an `ApiError`; a page that fails fails the whole read, so the shelf never shows a part of the
 * catalogue as if it were all of it.
 */
export async function fetchProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
  const products: ProductResponse[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, response } = await catalogApi.GET('/api/products', {
      params: { query: { page, size: CATALOG_PAGE_SIZE } },
      signal,
    })
    const items = data ?? []
    products.push(...items)

    const link = response.headers.get('Link')
    const paged = link !== null || response.headers.has('X-Total-Count')
    const hasNext = link !== null && /rel="?next"?/.test(link)
    if (!paged || !hasNext || items.length === 0) break
  }
  return products
}

/** GET /api/products/{id}. Rejects with an `ApiError`; status 404 means the product is gone. */
export async function fetchProduct(id: number, signal?: AbortSignal): Promise<ProductResponse> {
  const { data } = await catalogApi.GET('/api/products/{id}', { params: { path: { id } }, signal })
  if (!data) throw new Error('The server answered without a product.')
  return data
}
