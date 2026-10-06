import { http, HttpResponse } from 'msw'
import type { components } from '@/api/generated/catalog'
import { orderFixture } from './orders'

type ProductResponse = components['schemas']['ProductResponse']
type ApiError = components['schemas']['ApiError']

// Test data only: prices chosen to show Indian digit grouping, one product without a category.
export const productFixtures: ProductResponse[] = [
  {
    id: 1,
    name: 'Test Kettle',
    description: 'Fixture product',
    price: 1299,
    stockQuantity: 5,
    category: 'Kitchen',
    imageUrl: null,
  },
  {
    id: 2,
    name: 'Test Sofa',
    description: 'Fixture product',
    price: 125000.5,
    stockQuantity: 1,
    category: 'Furniture',
    imageUrl: null,
  },
  {
    id: 3,
    name: 'Test Gift Card',
    description: 'Fixture product',
    price: 500,
    stockQuantity: 10,
    category: null,
    imageUrl: null,
  },
]

/** Enough products for a second page (24 per page) and two categories plus none. */
export function manyProducts(count: number): ProductResponse[] {
  return Array.from({ length: count }, (_, index) => ({
    id: 100 + index,
    name: `Item ${String(index + 1).padStart(2, '0')}`,
    description: 'Fixture product',
    price: 100 + index,
    stockQuantity: 10,
    category: index % 2 === 0 ? 'Audio' : 'Kitchen',
    imageUrl: null,
  }))
}

export const SERVER_ERROR_CORRELATION_ID = 'test-correlation-id-500'

// The generic parameters (path params, request body, response body) type each response against
// the generated API types (src/api/generated), so a fixture that drifts from ProductResponse or ApiError fails the type check.
export const productHandlers = {
  success: http.get<never, never, ProductResponse[]>('/api/products', () => HttpResponse.json(productFixtures)),

  /** GET /api/products/:id from the fixtures; an id they do not hold is a 404 with the backend's body. */
  detail: http.get<{ id: string }, never, ProductResponse | ApiError>('/api/products/:id', ({ params }) => {
    const product = productFixtures.find((candidate) => candidate.id === Number(params.id))
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json({ status: 404, message: `Product ${params.id} not found` }, { status: 404 })
  }),

  empty: http.get<never, never, ProductResponse[]>('/api/products', () => HttpResponse.json([])),

  serverError: http.get<never, never, ApiError>('/api/products', () =>
    HttpResponse.json(
      { status: 500, message: 'The catalogue is unavailable right now.' },
      { status: 500, headers: { 'X-Correlation-Id': SERVER_ERROR_CORRELATION_ID } },
    ),
  ),
}

/** The happy path for every endpoint; a test swaps one in with `server.use(...)`. */
export const handlers = [
  productHandlers.success,
  productHandlers.detail,
  // A signed-in customer's header asks for the cart on every page; most tests do not care what is in it.
  http.get('/api/cart', () => HttpResponse.json({ id: 1, items: [], totalAmount: 0 })),
  // The order page asks for the order and its status: by default, order 42 is waiting to be settled.
  http.get('/api/orders/:id', ({ params }) => HttpResponse.json({ ...orderFixture(), id: Number(params.id) })),
  http.get('/api/orders/:id/status', ({ params }) =>
    HttpResponse.json({ orderId: Number(params.id), status: 'PENDING', reason: '', changedAt: '2026-10-06T10:00:00Z' }),
  ),
]
