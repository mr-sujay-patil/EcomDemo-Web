import { catalogApi } from '@/api/client'
import type { components } from '@/api/generated/catalog'

export type ProductResponse = components['schemas']['ProductResponse']

/** GET /api/products: the whole catalogue (no pagination, backend KI-007). Rejects with an `ApiError`. */
export async function fetchProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
  const { data } = await catalogApi.GET('/api/products', { signal })
  return data ?? []
}

/** GET /api/products/{id}. Rejects with an `ApiError`; status 404 means the product is gone. */
export async function fetchProduct(id: number, signal?: AbortSignal): Promise<ProductResponse> {
  const { data } = await catalogApi.GET('/api/products/{id}', { params: { path: { id } }, signal })
  if (!data) throw new Error('The server answered without a product.')
  return data
}
