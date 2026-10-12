import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EarlyRequest } from '@/api/earlyRequest'
import { fetchProducts } from '@/features/catalog/products'
// The file as it is in the repository (Vite's `?raw`): the same text the build copies into dist/index.html.
import indexHtml from '../../index.html?raw'

// The inline script in index.html (web KI-027), tested as it ships: taken out of the file and run in this page. On a product
// page it asks for the product's data at once (the same GET the app makes: same URL, Accept and a correlation id; no token, a
// product read is public and a fresh page has none), and when the answer names a photo, preloads it.

const inline = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])
const holder = window as { __ecomdemoEarly?: EarlyRequest }

function runAt(path: string, answer: () => Promise<Response>) {
  window.history.replaceState(null, '', path)
  const fetch = vi.fn(answer)
  vi.stubGlobal('fetch', fetch)
  // Running the shipped text is the point of this test (the browser runs it the same way, as a classic script).
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  new Function(inline[0] ?? 'throw new Error("index.html has no inline script")')()
  return fetch
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const preloads = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]')]

beforeEach(() => {
  for (const link of preloads()) link.remove()
})
afterEach(() => {
  delete holder.__ecomdemoEarly
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe("index.html's early product request", () => {
  it('is one inline script, and small (it is in every page)', () => {
    expect(inline).toHaveLength(1)
    expect(inline[0]?.length).toBeLessThan(1800)
  })

  it('on /products/7, asks for /api/products/7 with the headers the app sends, and leaves it for the app', async () => {
    const fetch = runAt('/products/7', () => json({ id: 7, imageUrl: null }))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]
    expect(url).toBe('/api/products/7')
    expect(init.headers.Accept).toBe('application/json')
    expect(init.headers['X-Correlation-Id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(init.headers).not.toHaveProperty('Authorization')
    expect(holder.__ecomdemoEarly?.path).toBe('/api/products/7')
    expect(holder.__ecomdemoEarly?.correlationId).toBe(init.headers['X-Correlation-Id'])
    // The app still gets the whole answer: the script read a copy.
    const response = await holder.__ecomdemoEarly?.response
    expect(await response?.json()).toEqual({ id: 7, imageUrl: null })
  })

  it("preloads the product's photo as soon as the answer names it, at high priority", async () => {
    runAt('/products/7/', () => json({ id: 7, imageUrl: '/api/products/7/image' }))
    await vi.waitFor(() => expect(preloads()).not.toEqual([]))

    expect(preloads().map((link) => [link.getAttribute('href'), link.getAttribute('fetchpriority')])).toEqual([
      ['/api/products/7/image', 'high'],
    ])
  })

  it('preloads nothing for no photo, a photo on another origin, or an error answer', async () => {
    runAt('/products/7', () => json({ id: 7, imageUrl: null }))
    runAt('/products/8', () => json({ id: 8, imageUrl: 'https://cdn.example/8.png' }))
    runAt('/products/9', () => json({ id: 9, imageUrl: '//cdn.example/9.png' }))
    runAt('/products/10', () => json({ status: 404, message: 'gone', imageUrl: '/api/x' }, 404))
    // A control, started last: once its photo is preloaded, the four before it have had their turn.
    runAt('/products/11', () => json({ id: 11, imageUrl: '/api/products/11/image' }))
    await vi.waitFor(() => expect(preloads()).not.toEqual([]))

    expect(preloads().map((link) => link.getAttribute('href'))).toEqual(['/api/products/11/image'])
  })

  it('swallows its own network failure (the app retries it), so nothing is reported as unhandled', async () => {
    runAt('/products/7', () => Promise.reject(new TypeError('Failed to fetch')))

    // Vitest fails the run on an unhandled rejection; the app's client, which takes this promise, sees the failure.
    await expect(holder.__ecomdemoEarly?.response).rejects.toThrow('Failed to fetch')
    expect(preloads()).toEqual([])
  })

  it("on the shelf (/), asks for the catalogue's first page with the headers the app sends, and leaves it for the app (web KI-042)", async () => {
    const fetch = runAt('/', () => json([{ id: 1, imageUrl: '/api/products/1/image' }]))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]
    expect(url).toBe('/api/products?page=0&size=100')
    expect(init.headers.Accept).toBe('application/json')
    expect(init.headers['X-Correlation-Id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(init.headers).not.toHaveProperty('Authorization')
    expect(holder.__ecomdemoEarly?.path).toBe('/api/products?page=0&size=100')
    expect(holder.__ecomdemoEarly?.correlationId).toBe(init.headers['X-Correlation-Id'])
    expect(await (await holder.__ecomdemoEarly?.response)?.json()).toEqual([
      { id: 1, imageUrl: '/api/products/1/image' },
    ])
    // The shelf's largest paint is text, not a photo: nothing is preloaded for a list.
    expect(preloads()).toEqual([])
  })

  it('asks for the same page on the shelf with filters in the address (they are applied in the browser)', () => {
    const fetch = runAt('/?category=AUDIO&sort=price', () => json([]))

    expect(fetch).toHaveBeenCalledWith('/api/products?page=0&size=100', expect.anything())
  })

  it("is the very request the app's shelf makes: the app reads the catalogue from it and asks the network nothing", async () => {
    const fetch = runAt('/', () => json([{ id: 1, name: 'Kettle' }]))

    const products = await fetchProducts()

    expect(products).toEqual([{ id: 1, name: 'Kettle' }])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(holder.__ecomdemoEarly?.taken).toBe(true)
  })

  it('asks nothing on any other page, nor for an id the product page itself refuses', () => {
    for (const path of [
      '/cart',
      '/search',
      '/products',
      '/about',
      '/products/abc',
      '/products/0',
      '/products/01',
      '/products/1.5',
      '/products/7/x',
    ]) {
      expect(
        runAt(path, () => json({})),
        path,
      ).not.toHaveBeenCalled()
    }
    // The product page takes up to 16 digits (ProductPage's parseId); so does the script.
    expect(runAt('/products/1234567890123456', () => json({}))).toHaveBeenCalledTimes(1)
    expect(runAt('/products/12345678901234567', () => json({}))).not.toHaveBeenCalled()
  })
})
