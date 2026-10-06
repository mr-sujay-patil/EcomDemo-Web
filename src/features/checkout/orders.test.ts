import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { fetchOrder, fetchOrders, fetchOrderStatus, placeOrder } from './orders'

const empty = () => new HttpResponse(null, { status: 200 })

describe('the order calls', () => {
  it.each([
    ['placeOrder', () => placeOrder(), 'post', '/api/orders', 'The server answered without an order.'],
    ['fetchOrder', () => fetchOrder(1), 'get', '/api/orders/1', 'The server answered without an order.'],
    [
      'fetchOrderStatus',
      () => fetchOrderStatus(1),
      'get',
      '/api/orders/1/status',
      'The server answered without a status.',
    ],
  ] as const)('%s refuses an empty answer', async (_name, call, method, path, message) => {
    server.use(http[method](path, empty))

    await expect(call()).rejects.toThrow(message)
  })

  it('fetchOrders treats an empty answer as no orders', async () => {
    server.use(http.get('/api/orders', empty))

    await expect(fetchOrders()).resolves.toEqual([])
  })
})
