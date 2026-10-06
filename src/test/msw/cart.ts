import { http, HttpResponse } from 'msw'
import type { components } from '@/api/generated/app'
import { productFixtures } from './handlers'

type Cart = components['schemas']['CartResponse']
type CartItem = components['schemas']['CartItemResponse']

export const emptyCart: Cart = { id: 1, items: [], totalAmount: 0 }

const line = (productId: number, productName: string, unitPrice: number, quantity: number): CartItem => ({
  productId,
  productName,
  unitPrice,
  quantity,
  lineTotal: unitPrice * quantity,
})

/**
 * A pretend cart server that behaves like the real one: every call changes its own cart and answers with the whole
 * of it, a line keeps the price it was added at (`priceAtAdd` overrides what the catalogue fixture says), and the
 * totals are added up here, on the "server" side (the app never does). `calls` lists the writes, in order.
 */
export function fakeCart({
  initial = [],
  priceAtAdd = {},
  refuse,
}: {
  initial?: { productId: number; quantity: number }[]
  priceAtAdd?: Record<number, number>
  /** Makes every write to this product answer with this status and message. */
  refuse?: { status: number; message: string }
} = {}) {
  const items: CartItem[] = []
  const calls: string[] = []
  const add = (productId: number, quantity: number) => {
    const existing = items.find((item) => item.productId === productId)
    if (existing) {
      existing.quantity += quantity
      existing.lineTotal = existing.unitPrice * existing.quantity
      return
    }
    const product = productFixtures.find((candidate) => candidate.id === productId)
    if (product) items.push(line(productId, product.name, priceAtAdd[productId] ?? product.price, quantity))
  }
  for (const { productId, quantity } of initial) add(productId, quantity)

  const view = (): Cart => ({
    id: 1,
    items: items.map((item) => ({ ...item })),
    totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
  })
  const refusal = () =>
    refuse ? HttpResponse.json({ status: refuse.status, message: refuse.message }, { status: refuse.status }) : null

  const handlers = [
    http.get('/api/cart', () => HttpResponse.json(view())),
    http.post<never, { productId: number; quantity: number }>('/api/cart/items', async ({ request }) => {
      const { productId, quantity } = await request.json()
      calls.push(`POST ${productId} x${quantity}`)
      const refused = refusal()
      if (refused) return refused
      add(productId, quantity)
      return HttpResponse.json(view())
    }),
    http.put<{ productId: string }, { quantity: number }>('/api/cart/items/:productId', async ({ params, request }) => {
      const { quantity } = await request.json()
      calls.push(`PUT ${params.productId} x${quantity}`)
      const refused = refusal()
      if (refused) return refused
      const item = items.find((candidate) => candidate.productId === Number(params.productId))
      if (!item) return HttpResponse.json({ status: 404, message: 'Not in your cart' }, { status: 404 })
      item.quantity = quantity
      item.lineTotal = item.unitPrice * quantity
      return HttpResponse.json(view())
    }),
    http.delete<{ productId: string }>('/api/cart/items/:productId', ({ params }) => {
      calls.push(`DELETE ${params.productId}`)
      const refused = refusal()
      if (refused) return refused
      const at = items.findIndex((candidate) => candidate.productId === Number(params.productId))
      if (at < 0) return HttpResponse.json({ status: 404, message: 'Not in your cart' }, { status: 404 })
      items.splice(at, 1)
      return HttpResponse.json(view())
    }),
  ]
  return { handlers, calls, view }
}
