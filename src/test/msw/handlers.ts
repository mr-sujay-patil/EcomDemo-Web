import { http, HttpResponse } from 'msw'
import type { components } from '@/api/generated/catalog'

type ProductResponse = components['schemas']['ProductResponse']
type ApiError = components['schemas']['ApiError']

// Test data only: prices chosen to show Indian digit grouping, one product without a category.
export const productFixtures: ProductResponse[] = [
  { id: 1, name: 'Test Kettle', description: 'Fixture product', price: 1299, stockQuantity: 5, category: 'Kitchen' },
  {
    id: 2,
    name: 'Test Sofa',
    description: 'Fixture product',
    price: 125000.5,
    stockQuantity: 1,
    category: 'Furniture',
  },
  { id: 3, name: 'Test Gift Card', description: 'Fixture product', price: 500, stockQuantity: 10, category: null },
]

export const SERVER_ERROR_CORRELATION_ID = 'test-correlation-id-500'

// The generic parameters (path params, request body, response body) type each response against
// the generated API types (src/api/generated), so a fixture that drifts from ProductResponse or ApiError fails the type check.
export const productHandlers = {
  success: http.get<never, never, ProductResponse[]>('/api/products', () => HttpResponse.json(productFixtures)),

  empty: http.get<never, never, ProductResponse[]>('/api/products', () => HttpResponse.json([])),

  serverError: http.get<never, never, ApiError>('/api/products', () =>
    HttpResponse.json(
      { status: 500, message: 'The catalogue is unavailable right now.' },
      { status: 500, headers: { 'X-Correlation-Id': SERVER_ERROR_CORRELATION_ID } },
    ),
  ),
}

/** The happy path for every endpoint; a test swaps one in with `server.use(...)`. */
export const handlers = [productHandlers.success]
