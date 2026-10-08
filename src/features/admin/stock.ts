import { inventoryApi } from '@/api/client'
import type { components } from '@/api/generated/inventory'

export type StockLevel = components['schemas']['StockResponse']

/** GET /api/inventory?productIds=1,2,3 (comma-separated, as the guide says). An empty list asks nothing. */
export async function fetchStock(productIds: number[], signal?: AbortSignal): Promise<StockLevel[]> {
  if (productIds.length === 0) return []
  const { data } = await inventoryApi.GET('/api/inventory', {
    params: { query: { productIds } },
    querySerializer: { array: { style: 'form', explode: false } },
    signal,
  })
  return data ?? []
}

/** PUT /api/inventory/{productId}: SETS the level (not a delta). `quantity` is 0 or more. */
export async function setStock(productId: number, quantity: number, signal?: AbortSignal): Promise<StockLevel> {
  const { data } = await inventoryApi.PUT('/api/inventory/{productId}', {
    params: { path: { productId } },
    body: { quantity },
    signal,
  })
  if (!data) throw new Error('The server answered without a stock level.')
  return data
}
