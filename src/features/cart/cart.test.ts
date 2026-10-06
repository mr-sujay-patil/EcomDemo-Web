import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { addCartItem, fetchCart, removeCartItem, setCartItemQuantity } from './cart'

describe('the cart calls', () => {
  it.each([
    ['fetchCart', () => fetchCart(), 'get', '/api/cart'],
    ['addCartItem', () => addCartItem(1, 1), 'post', '/api/cart/items'],
    ['setCartItemQuantity', () => setCartItemQuantity(1, 2), 'put', '/api/cart/items/1'],
    ['removeCartItem', () => removeCartItem(1), 'delete', '/api/cart/items/1'],
  ] as const)('%s refuses an answer without a cart', async (_name, call, method, path) => {
    server.use(http[method](path, () => new HttpResponse(null, { status: 200 })))

    await expect(call()).rejects.toThrow('The server answered without a cart.')
  })
})
