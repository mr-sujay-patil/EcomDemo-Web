// replaced by generated types in Phase 7
export type ProductResponse = {
  id: number
  name: string
  description: string
  price: number
  stockQuantity: number
  category: string | null
}

// replaced by generated types in Phase 7
export type ApiError = {
  status: number
  message: string
}

/** A failed call, carrying what the error state shows: the message and, for 5xx or network failures, the correlation id. */
export class ProductsRequestError extends Error {
  readonly status: number | null
  readonly correlationId: string | null

  constructor(message: string, status: number | null, correlationId: string | null) {
    super(message)
    this.name = 'ProductsRequestError'
    this.status = status
    this.correlationId = correlationId
  }
}

const CORRELATION_HEADER = 'X-Correlation-Id'

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiError).status === 'number' &&
    typeof (body as ApiError).message === 'string'
  )
}

// The gateway reuses a caller's id that matches [A-Za-z0-9_-]{8,64}, so a UUID sent here is the one
// in the backend logs, and there is still an id to show when no response arrives at all.
function newCorrelationId(): string | null {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null
}

/** GET /api/products: the whole catalogue (no pagination, backend KI-007). */
export async function fetchProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
  const sentId = newCorrelationId()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (sentId) headers[CORRELATION_HEADER] = sentId

  let response: Response
  try {
    response = await fetch('/api/products', { headers, signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ProductsRequestError('Could not reach the server. Check your connection and try again.', null, sentId)
  }

  if (response.ok) {
    return (await response.json()) as ProductResponse[]
  }

  const correlationId = response.headers.get(CORRELATION_HEADER) ?? sentId
  const body: unknown = await response.json().catch(() => null)
  const message = isApiError(body) ? body.message : `The server could not load the products (HTTP ${response.status}).`
  // The id helps support find a server-side failure; for a 4xx the message says enough.
  const shownId = response.status >= 500 ? correlationId : null
  throw new ProductsRequestError(message, response.status, shownId)
}
