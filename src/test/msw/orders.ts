import { http, HttpResponse } from 'msw'
import type { components } from '@/api/generated/app'

type Order = components['schemas']['OrderResponse']
type Status = Order['status']
type Cart = components['schemas']['CartResponse']

const placedAt = '2026-10-06T10:00:00Z'

/** An order as the API returns it, for tests that only need one to exist. */
export function orderFixture(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    placedAt,
    username: 'asha.rao',
    status: 'PENDING',
    statusReason: '',
    statusChangedAt: placedAt,
    totalAmount: 1299,
    items: [{ productId: 1, productName: 'Test Kettle', unitPrice: 1299, quantity: 1, lineTotal: 1299 }],
    ...overrides,
  }
}

/**
 * A pretend order server. `POST /api/orders` takes the whole cart (`takeCart` empties it, as the real one does) and
 * answers PENDING; `GET …/status` then answers the next of `statuses` each time it is asked, and the last one
 * for ever. `calls` lists what was asked, in order. `refuse` answers the POST with that status instead; `drop`
 * makes the POST fail as if the network died, after (or before) the order was made.
 */
export function fakeOrders({
  cart,
  takeCart,
  statuses = ['PENDING', 'CONFIRMED'],
  reason = '',
  refuse,
  drop,
}: {
  cart: () => Cart
  takeCart: () => void
  statuses?: Status[]
  reason?: string
  refuse?: { status: number; message: string; retryAfter?: number }
  drop?: 'before' | 'after'
}) {
  const orders: Order[] = []
  const calls: string[] = []
  let asked = 0
  const make = (): Order => {
    const taken = cart()
    const order = orderFixture({ id: 100 + orders.length, items: taken.items, totalAmount: taken.totalAmount })
    orders.push(order)
    takeCart()
    return order
  }
  const handlers = [
    http.post('/api/orders', () => {
      calls.push('POST /api/orders')
      if (refuse)
        return HttpResponse.json(
          { status: refuse.status, message: refuse.message },
          {
            status: refuse.status,
            headers: refuse.retryAfter === undefined ? {} : { 'Retry-After': String(refuse.retryAfter) },
          },
        )
      if (drop === 'before') return HttpResponse.error()
      const order = make()
      return drop === 'after' ? HttpResponse.error() : HttpResponse.json(order, { status: 201 })
    }),
    http.get('/api/orders', () => {
      calls.push('GET /api/orders')
      return HttpResponse.json(orders)
    }),
    http.get<{ id: string }>('/api/orders/:id', ({ params }) => {
      calls.push(`GET /api/orders/${params.id}`)
      const order = orders.find((candidate) => candidate.id === Number(params.id))
      return order
        ? HttpResponse.json(order)
        : HttpResponse.json({ status: 404, message: `Order ${params.id} not found` }, { status: 404 })
    }),
    http.get<{ id: string }>('/api/orders/:id/status', ({ params }) => {
      calls.push(`GET /api/orders/${params.id}/status`)
      const status = statuses[Math.min(asked, statuses.length - 1)]!
      asked += 1
      return HttpResponse.json({
        orderId: Number(params.id),
        status,
        reason: status === 'CANCELLED' ? reason : '',
        changedAt: '2026-10-06T10:00:05Z',
      })
    }),
  ]
  return { handlers, calls, orders, statusRequests: () => asked }
}
