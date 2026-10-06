import { appApi } from '@/api/client'
import type { components } from '@/api/generated/app'

export type Cart = components['schemas']['CartResponse']
export type CartItem = components['schemas']['CartItemResponse']

// Every cart call answers with the whole cart after its change (guide, "Cart"): the caller stores
// that answer and never patches the old one. Each rejects with an `ApiError`.

/** GET /api/cart. */
export async function fetchCart(signal?: AbortSignal): Promise<Cart> {
  const { data } = await appApi.GET('/api/cart', { signal })
  if (!data) throw new Error('The server answered without a cart.')
  return data
}

/** POST /api/cart/items: adds to the line if the product is already in the cart. Stock is not checked here. */
export async function addCartItem(productId: number, quantity: number): Promise<Cart> {
  const { data } = await appApi.POST('/api/cart/items', { body: { productId, quantity } })
  if (!data) throw new Error('The server answered without a cart.')
  return data
}

/** PUT /api/cart/items/{productId}: sets the line's quantity. */
export async function setCartItemQuantity(productId: number, quantity: number): Promise<Cart> {
  const { data } = await appApi.PUT('/api/cart/items/{productId}', {
    params: { path: { productId } },
    body: { quantity },
  })
  if (!data) throw new Error('The server answered without a cart.')
  return data
}

/** DELETE /api/cart/items/{productId}. */
export async function removeCartItem(productId: number): Promise<Cart> {
  const { data } = await appApi.DELETE('/api/cart/items/{productId}', { params: { path: { productId } } })
  if (!data) throw new Error('The server answered without a cart.')
  return data
}
