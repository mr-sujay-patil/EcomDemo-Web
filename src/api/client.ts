import createClient, { type Middleware } from 'openapi-fetch'
import { apiErrorFromResponse, ApiError, CORRELATION_HEADER, NETWORK_ERROR_MESSAGE } from './errors'
import type { paths as AppPaths } from './generated/app'
import type { paths as AssistantPaths } from './generated/assistant'
import type { paths as CatalogPaths } from './generated/catalog'
import type { paths as CustomerPaths } from './generated/customer'
import type { paths as InventoryPaths } from './generated/inventory'
import { createRetryingFetch } from './retry'

type TokenProvider = () => string | null

// Phase 11 injects the session here; until then nobody is signed in. The token itself stays in
// the session's memory, never in this module.
let currentToken: TokenProvider = () => null

export function setAccessTokenProvider(provider: TokenProvider) {
  currentToken = provider
}

// The gateway reuses a caller's id that matches [A-Za-z0-9_-]{8,64}, so a UUID sent here is the
// one in the backend logs, and there is still an id to show when no response arrives at all.
// `randomUUID` exists only in secure contexts (https, localhost): without it no id is sent.
function newCorrelationId(): string | null {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null
}

/**
 * What every call gets, in one place:
 * - `Authorization: Bearer` when someone is signed in, on every call (the assistant and inventory
 *   documents mark no call as protected, web KI-011, so the client cannot tell which need one; the
 *   rules are in access.ts, from the guide);
 * - a fresh `X-Correlation-Id`;
 * - any failure becomes an `ApiError`, so callers handle one error type.
 */
function createMiddleware(getToken: TokenProvider): Middleware {
  return {
    onRequest({ request }) {
      request.headers.set('Accept', 'application/json')
      const correlationId = newCorrelationId()
      if (correlationId) request.headers.set(CORRELATION_HEADER, correlationId)
      const token = getToken()
      if (token && !request.headers.has('Authorization')) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
    async onResponse({ request, response }) {
      if (response.ok) return undefined
      throw await apiErrorFromResponse(response, request.headers.get(CORRELATION_HEADER))
    },
    onError({ request, error }) {
      // An ApiError thrown by onResponse passes through; an aborted call is the caller's own doing.
      if (error instanceof ApiError || request.signal.aborted) return undefined
      return new ApiError({
        status: 0,
        message: NETWORK_ERROR_MESSAGE,
        correlationId: request.headers.get(CORRELATION_HEADER),
      })
    },
  }
}

type ClientOptions = {
  /** For tests: replaces the network. */
  fetch?: (request: Request) => Promise<Response>
  /** For tests: replaces the waiting between a failure and its one retry. */
  sleep?: (ms: number) => Promise<void>
  /** For tests: replaces the injected session. */
  getToken?: TokenProvider
}

/** One typed client for the paths of one backend document. Requests go to the page's own origin, through the `/api` proxy. */
export function createApiClient<Paths extends object>({ fetch, sleep, getToken }: ClientOptions = {}) {
  // The documents' paths already start with /api, so the base is the origin alone; relative URLs
  // cannot be built into a Request outside a browser, hence `location.origin`.
  const client = createClient<Paths>({
    baseUrl: typeof location === 'undefined' ? 'http://localhost' : location.origin,
    fetch: createRetryingFetch({ fetch, sleep }),
  })
  client.use(createMiddleware(getToken ?? (() => currentToken())))
  return client
}

export const catalogApi = createApiClient<CatalogPaths>()
export const customerApi = createApiClient<CustomerPaths>()
export const appApi = createApiClient<AppPaths>()
export const assistantApi = createApiClient<AssistantPaths>()
export const inventoryApi = createApiClient<InventoryPaths>()
