import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProduct, fetchProducts } from './products'

/**
 * The query keys of the catalogue, in one place. A key is the cache's address: two components that
 * ask for the same key share one request and one cached answer, and `invalidateQueries` can aim at
 * a whole branch (`catalogKeys.all`) or one entry.
 */
export const catalogKeys = {
  all: ['catalog'] as const,
  list: () => [...catalogKeys.all, 'list'] as const,
  detail: (id: number) => [...catalogKeys.all, 'detail', id] as const,
}

// The catalogue changes when an admin edits it, not by the second: five minutes fresh means
// moving between the shelf and a product page asks the server nothing, and a window focus does not
// refetch it (the app-wide default does, for data that changes under the user).
const CATALOG_STALE_TIME = 5 * 60 * 1000

export const productsQuery = () =>
  queryOptions({
    queryKey: catalogKeys.list(),
    queryFn: ({ signal }) => fetchProducts(signal),
    staleTime: CATALOG_STALE_TIME,
    refetchOnWindowFocus: false,
  })

export const productQuery = (id: number) =>
  queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    staleTime: CATALOG_STALE_TIME,
    refetchOnWindowFocus: false,
  })

export function useProducts() {
  return useQuery(productsQuery())
}

/** A product page's data. `enabled: false` for an id that cannot exist, so nothing is requested for `/products/abc`. */
export function useProduct(id: number | null) {
  return useQuery({ ...productQuery(id ?? 0), enabled: id !== null })
}

/** Starts loading a product before anyone opens it (on card hover or focus); a fresh cache entry is not refetched. */
export function usePrefetchProduct() {
  const queryClient = useQueryClient()
  return (id: number) => {
    void queryClient.prefetchQuery(productQuery(id))
  }
}
