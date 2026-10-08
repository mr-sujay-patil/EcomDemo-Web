import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { manyProducts } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { CATALOG_PAGE_SIZE, fetchProducts } from './products'

/** The backend as it pages now: `page` from 0, `size` at most 100, id order, the total in X-Total-Count, the next page in Link. */
function pagedBackend(total: number) {
  const everything = manyProducts(total)
  const requests: Array<{ page: number; size: number }> = []
  const handler = http.get('/api/products', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 50)
    requests.push({ page, size })
    const items = everything.slice(page * size, page * size + size)
    const last = Math.max(0, Math.ceil(total / size) - 1)
    const links = [
      `</api/products?page=0&size=${size}>; rel="first"`,
      `</api/products?page=${last}&size=${size}>; rel="last"`,
    ]
    if (page < last) links.push(`</api/products?page=${page + 1}&size=${size}>; rel="next"`)
    return HttpResponse.json(items, { headers: { 'X-Total-Count': String(total), Link: links.join(', ') } })
  })
  return { everything, requests, handler }
}

describe('fetchProducts', () => {
  it('reads every page, in order, so the shelf can sort the whole catalogue', async () => {
    const backend = pagedBackend(250)
    server.use(backend.handler)

    const products = await fetchProducts()

    expect(products).toHaveLength(250)
    expect(products.map((product) => product.id)).toEqual(backend.everything.map((product) => product.id))
    expect(backend.requests).toEqual([
      { page: 0, size: CATALOG_PAGE_SIZE },
      { page: 1, size: CATALOG_PAGE_SIZE },
      { page: 2, size: CATALOG_PAGE_SIZE },
    ])
  })

  it('asks the backend for its largest page, 100', () => {
    expect(CATALOG_PAGE_SIZE).toBe(100)
  })

  it('costs one request when the catalogue fits in one page', async () => {
    const backend = pagedBackend(14)
    server.use(backend.handler)

    expect(await fetchProducts()).toHaveLength(14)
    expect(backend.requests).toHaveLength(1)
  })

  it('stops at a page that is exactly full when the backend says there is no next one', async () => {
    const backend = pagedBackend(200)
    server.use(backend.handler)

    expect(await fetchProducts()).toHaveLength(200)
    expect(backend.requests).toHaveLength(2)
  })

  it('does not follow anything when the backend does not page (no Link, no total): it already sent everything', async () => {
    let asked = 0
    server.use(
      http.get('/api/products', () => {
        asked += 1
        return HttpResponse.json(manyProducts(150))
      }),
    )

    expect(await fetchProducts()).toHaveLength(150)
    expect(asked).toBe(1)
  })

  it('gives an empty catalogue as an empty list', async () => {
    const backend = pagedBackend(0)
    server.use(backend.handler)

    expect(await fetchProducts()).toEqual([])
    expect(backend.requests).toHaveLength(1)
  })

  it('stops on an empty page even if the backend still names a next one', async () => {
    let asked = 0
    server.use(
      http.get('/api/products', () => {
        asked += 1
        return HttpResponse.json([], { headers: { Link: '</api/products?page=9&size=100>; rel="next"' } })
      }),
    )

    expect(await fetchProducts()).toEqual([])
    expect(asked).toBe(1)
  })

  it('gives up after 100 pages rather than ask for ever of a backend that never says "last"', async () => {
    let asked = 0
    server.use(
      http.get('/api/products', () => {
        asked += 1
        return HttpResponse.json(manyProducts(1), { headers: { Link: '</api/products?page=9&size=100>; rel="next"' } })
      }),
    )

    expect(await fetchProducts()).toHaveLength(100)
    expect(asked).toBe(100)
  })

  it('fails as a whole when a later page fails: never a part shown as the whole catalogue', async () => {
    const backend = pagedBackend(250)
    server.use(
      http.get('/api/products', ({ request }) => {
        if (new URL(request.url).searchParams.get('page') === '1')
          return HttpResponse.json(
            { status: 503, message: 'Catalogue is down.' },
            { status: 503, headers: { 'Retry-After': '10' } },
          )
        return backend.handler
          .run({ request, requestId: 'test' })
          .then((result) => result?.response ?? HttpResponse.error())
      }),
    )

    const failure: unknown = await fetchProducts().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 503, retryAfter: 10 })
  })
})
