import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { createApiClient, setAccessTokenProvider, setTokenRejectedHandler } from './client'
import { ApiError, NETWORK_ERROR_MESSAGE } from './errors'
import type { paths as AppPaths } from './generated/app'
import type { paths as CatalogPaths } from './generated/catalog'
import type { paths as CustomerPaths } from './generated/customer'

const product = { id: 1, name: 'Kettle', description: 'd', price: 10, stockQuantity: 1, category: null }
const newProduct = { name: 'Kettle', price: 10, stockQuantity: 1 }

/** A client whose waiting is recorded, not done, so a retry costs no time. */
function setup(getToken?: () => string | null) {
  const sleeps: number[] = []
  const sleep = (ms: number) => {
    sleeps.push(ms)
    return Promise.resolve()
  }
  return {
    sleeps,
    catalog: createApiClient<CatalogPaths>({ sleep, getToken }),
    app: createApiClient<AppPaths>({ sleep, getToken }),
  }
}

/** The ApiError a call rejects with. */
async function failure(call: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await call.then(
    () => null,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('requests', () => {
  it('sends a fresh X-Correlation-Id with every call', async () => {
    const ids: string[] = []
    server.use(
      http.get('/api/products/:id', ({ request }) => {
        ids.push(request.headers.get('X-Correlation-Id') ?? '')
        return HttpResponse.json(product)
      }),
    )
    const { catalog } = setup()

    await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })
    await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })

    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(ids[1]).toMatch(/^[0-9a-f-]{36}$/)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('sends the Bearer token when someone is signed in, and none otherwise', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get('/api/products/:id', ({ request }) => {
        seen.push(request.headers.get('Authorization'))
        return HttpResponse.json(product)
      }),
    )
    let token: string | null = 'abc.def.ghi'
    const { catalog } = setup(() => token)

    await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })
    token = null
    await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })

    expect(seen).toEqual(['Bearer abc.def.ghi', null])
  })

  it('returns the typed body on success', async () => {
    server.use(http.get('/api/products/:id', () => HttpResponse.json(product)))
    const { catalog } = setup()

    const { data } = await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })

    expect(data?.name).toBe('Kettle')
  })
})

describe('error mapping', () => {
  it.each([
    [400, 'fullName must not be blank; password must be between 8 and 72 characters'],
    [401, 'Authentication is required'],
    [403, 'Not permitted'],
    [404, 'Product 42 not found'],
    [409, "Insufficient stock for 'Mouse': requested 3, available 2"],
  ])('maps %i to an ApiError carrying the backend’s message', async (status, message) => {
    server.use(http.post('/api/products', () => HttpResponse.json({ status, message }, { status })))
    const { catalog } = setup()

    const error = await failure(catalog.POST('/api/products', { body: newProduct }))

    expect(error.status).toBe(status)
    expect(error.message).toBe(message)
    expect(error.retryAfter).toBeUndefined()
  })

  it('keeps the correlation id from a 500 response', async () => {
    server.use(
      http.get('/api/products/:id', () =>
        HttpResponse.json(
          { status: 500, message: 'The catalogue is unavailable.' },
          { status: 500, headers: { 'X-Correlation-Id': 'from-the-server' } },
        ),
      ),
    )
    const { catalog } = setup()

    const error = await failure(catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } }))

    expect(error.status).toBe(500)
    expect(error.correlationId).toBe('from-the-server')
  })

  it('falls back to the id it sent when the response carries none, and to a generic message without a body', async () => {
    let sent = ''
    server.use(
      http.get('/api/products/:id', ({ request }) => {
        sent = request.headers.get('X-Correlation-Id') ?? ''
        return new HttpResponse('<html>Bad gateway</html>', { status: 502 })
      }),
    )
    const { catalog } = setup()

    const error = await failure(catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } }))

    expect(error.message).toBe('The server could not complete the request (HTTP 502).')
    expect(error.correlationId).toBe(sent)
  })

  it('reports a network failure as status 0 with the id it sent', async () => {
    let sent = ''
    server.use(
      http.post('/api/products', ({ request }) => {
        sent = request.headers.get('X-Correlation-Id') ?? ''
        return HttpResponse.error()
      }),
    )
    const { catalog } = setup()

    const error = await failure(catalog.POST('/api/products', { body: newProduct }))

    expect(error.status).toBe(0)
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE)
    expect(error.correlationId).toBe(sent)
  })

  it('carries Retry-After as seconds, from login throttling', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { status: 429, message: 'Too many failed logins. Try again in 30 seconds.' },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    )
    const { sleeps } = setup()
    const customer = createApiClient<CustomerPaths>()

    const error = await failure(customer.POST('/api/auth/login', { body: { username: 'a', password: 'b' } }))

    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(30)
    expect(error.message).toBe('Too many failed logins. Try again in 30 seconds.')
    expect(sleeps).toEqual([])
  })
})

describe('a refused token (401)', () => {
  const refuse = (status: number) =>
    server.use(http.get('/api/products', () => HttpResponse.json({ status, message: 'No.' }, { status })))

  function watch() {
    const rejected: string[] = []
    setTokenRejectedHandler((token) => {
      rejected.push(token)
    })
    return rejected
  }

  afterEach(() => {
    setTokenRejectedHandler(null)
    setAccessTokenProvider(null)
  })

  it('tells the session which token was refused, so it can end', async () => {
    const rejected = watch()
    refuse(401)
    const { catalog } = setup(() => 'tok-1')

    await failure(catalog.GET('/api/products'))

    expect(rejected).toEqual(['tok-1'])
  })

  it('is just an error when no session is listening', async () => {
    setTokenRejectedHandler(null)
    refuse(401)
    const { catalog } = setup(() => 'tok-1')

    expect((await failure(catalog.GET('/api/products'))).status).toBe(401)
  })

  it('says nothing when the request carried no token: a 401 from the login is a wrong password, not an ended session', async () => {
    const rejected = watch()
    refuse(401)
    const { catalog } = setup(() => null)

    await failure(catalog.GET('/api/products'))

    expect(rejected).toEqual([])
  })

  it.each([403, 404, 500])('says nothing for a %s: only a refused identity ends a session', async (status) => {
    const rejected = watch()
    refuse(status)
    const { catalog } = setup(() => 'tok-1')

    await failure(catalog.GET('/api/products'))

    expect(rejected).toEqual([])
  })

  it('tells the token the request actually carried, even when the session has moved on since', async () => {
    const rejected = watch()
    let current = 'tok-old'
    server.use(
      http.get('/api/products', () => {
        current = 'tok-new'
        return HttpResponse.json({ status: 401, message: 'No.' }, { status: 401 })
      }),
    )
    const { catalog } = setup(() => current)

    await failure(catalog.GET('/api/products'))

    expect(rejected).toEqual(['tok-old'])
  })

  it('uses the injected token provider for the shared clients, and stops when it is taken away', async () => {
    let seen: string | null = null
    server.use(
      http.get('/api/products', ({ request }) => {
        seen = request.headers.get('Authorization')
        return HttpResponse.json([])
      }),
    )
    const client = createApiClient<CatalogPaths>()

    setAccessTokenProvider(() => 'tok-injected')
    await client.GET('/api/products')
    expect(seen).toBe('Bearer tok-injected')

    setAccessTokenProvider(() => null)
    await client.GET('/api/products')
    expect(seen).toBeNull()
  })
})

describe('retry policy', () => {
  const rateLimited = (retryAfter?: string) =>
    HttpResponse.json(
      { status: 429, message: 'Slow down' },
      { status: 429, headers: retryAfter ? { 'Retry-After': retryAfter } : {} },
    )

  it('retries a GET once after a 429, waiting the Retry-After it was given', async () => {
    let calls = 0
    server.use(
      http.get('/api/products/:id', () => (++calls === 1 ? rateLimited('2') : HttpResponse.json(product))),
    )
    const { catalog, sleeps } = setup()

    const { data } = await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })

    expect(data?.name).toBe('Kettle')
    expect(calls).toBe(2)
    expect(sleeps).toEqual([2000])
  })

  it('waits one second when the 429 gives no Retry-After', async () => {
    let calls = 0
    server.use(http.get('/api/products/:id', () => (++calls === 1 ? rateLimited() : HttpResponse.json(product))))
    const { catalog, sleeps } = setup()

    await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })

    expect(sleeps).toEqual([1000])
  })

  it('retries only once: a second 429 is the answer', async () => {
    let calls = 0
    server.use(
      http.get('/api/products/:id', () => {
        calls++
        return rateLimited('1')
      }),
    )
    const { catalog } = setup()

    const error = await failure(catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } }))

    expect(calls).toBe(2)
    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(1)
  })

  it('does not wait out a long Retry-After: the 429 goes to the caller', async () => {
    let calls = 0
    server.use(
      http.get('/api/products/:id', () => {
        calls++
        return rateLimited('30')
      }),
    )
    const { catalog, sleeps } = setup()

    const error = await failure(catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } }))

    expect(calls).toBe(1)
    expect(sleeps).toEqual([])
    expect(error.retryAfter).toBe(30)
  })

  it('retries a GET once after a network failure', async () => {
    let calls = 0
    server.use(http.get('/api/products/:id', () => (++calls === 1 ? HttpResponse.error() : HttpResponse.json(product))))
    const { catalog, sleeps } = setup()

    const { data } = await catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } })

    expect(data?.name).toBe('Kettle')
    expect(calls).toBe(2)
    expect(sleeps).toEqual([500])
  })

  it('gives up after the second network failure', async () => {
    let calls = 0
    server.use(
      http.get('/api/products/:id', () => {
        calls++
        return HttpResponse.error()
      }),
    )
    const { catalog } = setup()

    const error = await failure(catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } }))

    expect(calls).toBe(2)
    expect(error.status).toBe(0)
  })

  it.each([400, 401, 403, 404, 409, 500, 503])('never retries a GET answered %i', async (status) => {
    let calls = 0
    server.use(
      http.get('/api/products/:id', () => {
        calls++
        return HttpResponse.json({ status, message: 'no' }, { status })
      }),
    )
    const { catalog } = setup()

    await failure(catalog.GET('/api/products/{id}', { params: { path: { id: 1 } } }))

    expect(calls).toBe(1)
  })

  it('never retries a mutation: not on 429, not on a network failure', async () => {
    let calls = 0
    server.use(
      http.post('/api/products', () => {
        calls++
        return calls === 1 ? rateLimited('1') : HttpResponse.error()
      }),
    )
    const { catalog, sleeps } = setup()

    await failure(catalog.POST('/api/products', { body: newProduct }))
    await failure(catalog.POST('/api/products', { body: newProduct }))

    expect(calls).toBe(2)
    expect(sleeps).toEqual([])
  })

  it('never retries POST /api/orders, even after a network failure', async () => {
    let calls = 0
    server.use(
      http.post('/api/orders', () => {
        calls++
        return HttpResponse.error()
      }),
    )
    const { app } = setup()

    const error = await failure(app.POST('/api/orders'))

    expect(error.status).toBe(0)
    expect(calls).toBe(1)
  })

  it('does not retry, nor wrap, a request the caller aborted', async () => {
    let calls = 0
    server.use(
      http.get('/api/products/:id', async () => {
        calls++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json(product)
      }),
    )
    const { catalog, sleeps } = setup()
    const controller = new AbortController()

    const pending = catalog.GET('/api/products/{id}', { params: { path: { id: 1 } }, signal: controller.signal })
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toBeLessThanOrEqual(1)
    expect(sleeps).toEqual([])
  })
})

describe('the shared clients', () => {
  it('send the token the session provider hands them, and none after it is cleared', async () => {
    const { catalogApi, setAccessTokenProvider } = await import('./client')
    const seen: (string | null)[] = []
    server.use(
      http.get('/api/products', ({ request }) => {
        seen.push(request.headers.get('Authorization'))
        return HttpResponse.json([])
      }),
    )

    setAccessTokenProvider(() => 'session-token')
    await catalogApi.GET('/api/products')
    setAccessTokenProvider(() => null)
    await catalogApi.GET('/api/products')

    expect(seen).toEqual(['Bearer session-token', null])
  })

  it('are created for each service on the page’s own origin', async () => {
    const { catalogApi } = await import('./client')
    server.use(http.get('/api/products', () => HttpResponse.json([product])))

    const { data } = await catalogApi.GET('/api/products')

    expect(data).toHaveLength(1)
  })
})
