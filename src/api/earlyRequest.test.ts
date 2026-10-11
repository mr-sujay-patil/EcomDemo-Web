import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { createApiClient } from './client'
import { ApiError } from './errors'
import { type EarlyRequest, takeEarlyResponse } from './earlyRequest'
import type { paths as CatalogPaths } from './generated/catalog'

// index.html's inline script asks for a product page's data before the app's JavaScript has even downloaded (web KI-027), and
// leaves the request on `window.__ecomdemoEarly`. The API client takes it, once, instead of asking again.

const product = { id: 7, name: 'Kettle', description: 'd', price: 10, stockQuantity: 1, category: null, imageUrl: null }
const holder = window as { __ecomdemoEarly?: EarlyRequest }

function leaveEarly(response: Promise<Response>, path = '/api/products/7', correlationId: string | null = 'early-id-0001') {
  // The inline script marks its own promise as handled, so a failure before the app takes it is not an "unhandled rejection".
  response.catch(() => undefined)
  holder.__ecomdemoEarly = { path, correlationId, response }
}

const get = (path: string, init: RequestInit = {}) => {
  const request = new Request(new URL(path, location.origin), init)
  request.headers.set('X-Correlation-Id', 'app-made-id-0002')
  return request
}

afterEach(() => {
  delete holder.__ecomdemoEarly
})

describe('takeEarlyResponse', () => {
  it('hands over the early request for the same GET, once, and says which correlation id was really sent', () => {
    const response = Promise.resolve(HttpResponse.json(product))
    leaveEarly(response)
    const request = get('/api/products/7')

    expect(takeEarlyResponse(request)).toBe(response)
    expect(request.headers.get('X-Correlation-Id')).toBe('early-id-0001')
    expect(holder.__ecomdemoEarly?.taken).toBe(true)
    expect(takeEarlyResponse(get('/api/products/7'))).toBeNull()
  })

  it('drops the correlation id the app made when the early request could not send one (no crypto.randomUUID)', () => {
    leaveEarly(Promise.resolve(HttpResponse.json(product)), '/api/products/7', null)
    const request = get('/api/products/7')

    expect(takeEarlyResponse(request)).not.toBeNull()
    expect(request.headers.has('X-Correlation-Id')).toBe(false)
  })

  it('leaves it for a different path, query or origin', () => {
    leaveEarly(Promise.resolve(HttpResponse.json(product)))

    expect(takeEarlyResponse(get('/api/products/8'))).toBeNull()
    expect(takeEarlyResponse(get('/api/products/7?page=0'))).toBeNull()
    expect(takeEarlyResponse(new Request('https://elsewhere.example/api/products/7'))).toBeNull()
    expect(holder.__ecomdemoEarly?.taken).toBeUndefined()
  })

  it('never answers a write, a signed-in call (different headers) or a call already aborted', () => {
    leaveEarly(Promise.resolve(HttpResponse.json(product)))
    const aborted = new AbortController()
    aborted.abort()

    expect(takeEarlyResponse(get('/api/products/7', { method: 'PUT' }))).toBeNull()
    expect(takeEarlyResponse(get('/api/products/7', { headers: { Authorization: 'Bearer t' } }))).toBeNull()
    expect(takeEarlyResponse(get('/api/products/7', { signal: aborted.signal }))).toBeNull()
    expect(holder.__ecomdemoEarly?.taken).toBeUndefined()
  })

  it('does nothing on a page that made no early request', () => {
    expect(takeEarlyResponse(get('/api/products/7'))).toBeNull()
  })
})

describe('the API client with an early request', () => {
  /** Counts what reaches the network (MSW), so "no second request" is measured, not assumed. */
  function network(answer: () => Response = () => HttpResponse.json({ ...product, name: 'From the network' })) {
    const calls: string[] = []
    server.use(
      http.get('/api/products/:id', ({ request }) => {
        calls.push(new URL(request.url).pathname)
        return answer()
      }),
    )
    return calls
  }
  const sleep = () => Promise.resolve()

  it('reads the product from the early request and asks the network nothing', async () => {
    const calls = network()
    leaveEarly(Promise.resolve(HttpResponse.json(product)))
    const catalog = createApiClient<CatalogPaths>({ sleep })

    const { data } = await catalog.GET('/api/products/{id}', { params: { path: { id: 7 } } })

    expect(data?.name).toBe('Kettle')
    expect(calls).toEqual([])
  })

  it('asks the network for the next read of the same product (the early answer is used once)', async () => {
    const calls = network()
    leaveEarly(Promise.resolve(HttpResponse.json(product)))
    const catalog = createApiClient<CatalogPaths>({ sleep })

    await catalog.GET('/api/products/{id}', { params: { path: { id: 7 } } })
    const { data } = await catalog.GET('/api/products/{id}', { params: { path: { id: 7 } } })

    expect(data?.name).toBe('From the network')
    expect(calls).toEqual(['/api/products/7'])
  })

  it('turns an early 404 into the same ApiError, with the id the early request sent, without asking again', async () => {
    const calls = network()
    leaveEarly(
      Promise.resolve(HttpResponse.json({ status: 404, message: 'Product 7 not found' }, { status: 404 })),
      '/api/products/7',
      'early-id-0404',
    )
    const catalog = createApiClient<CatalogPaths>({ sleep })

    const error: unknown = await catalog.GET('/api/products/{id}', { params: { path: { id: 7 } } }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).correlationId).toBe('early-id-0404')
    expect(calls).toEqual([])
  })

  it('keeps the retry policy: an early request that failed at the network level is retried once, for real', async () => {
    const calls = network()
    leaveEarly(Promise.reject(new TypeError('Failed to fetch')))
    const catalog = createApiClient<CatalogPaths>({ sleep })

    const { data } = await catalog.GET('/api/products/{id}', { params: { path: { id: 7 } } })

    expect(data?.name).toBe('From the network')
    expect(calls).toEqual(['/api/products/7'])
  })
})
