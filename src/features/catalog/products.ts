import { catalogApi } from '@/api/client'
import type { components } from '@/api/generated/catalog'

export type ProductResponse = components['schemas']['ProductResponse']

/** GET /api/products: the whole catalogue (no pagination, backend KI-007). Rejects with an `ApiError`. */
export async function fetchProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
  const { data } = await catalogApi.GET('/api/products', { signal })
  return data ?? []
}
