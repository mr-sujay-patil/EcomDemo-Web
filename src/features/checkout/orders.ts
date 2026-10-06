import { appApi } from '@/api/client'
import type { components } from '@/api/generated/app'

export type Order = components['schemas']['OrderResponse']
export type OrderItem = components['schemas']['OrderItemResponse']
export type OrderStatusAnswer = components['schemas']['OrderStatusResponse']

// Each rejects with an `ApiError`.

/**
 * POST /api/orders: checks out the whole cart. `201` means "received", the order is PENDING. This is never
 * retried by anything (the client retries only reads): a lost answer does not mean no order was made.
 */
export async function placeOrder(): Promise<Order> {
  const { data } = await appApi.POST('/api/orders')
  if (!data) throw new Error('The server answered without an order.')
  return data
}

/** GET /api/orders: the signed-in customer's own orders. */
export async function fetchOrders(signal?: AbortSignal): Promise<Order[]> {
  const { data } = await appApi.GET('/api/orders', { signal })
  return data ?? []
}

/** GET /api/orders/{id}. 403 for another customer's order, 404 for none. */
export async function fetchOrder(id: number, signal?: AbortSignal): Promise<Order> {
  const { data } = await appApi.GET('/api/orders/{id}', { params: { path: { id } }, signal })
  if (!data) throw new Error('The server answered without an order.')
  return data
}

/** GET /api/orders/{id}/status: the light call to poll. */
export async function fetchOrderStatus(id: number, signal?: AbortSignal): Promise<OrderStatusAnswer> {
  const { data } = await appApi.GET('/api/orders/{id}/status', { params: { path: { id } }, signal })
  if (!data) throw new Error('The server answered without a status.')
  return data
}
