import { readFileSync } from 'node:fs'
import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { allProducts, madeByTheAdminSpec, everyShelfCard } from './live-data'
import { abortedRequestError, gatewayUnreachable } from './screens'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

test('the shelf shows every product in the catalogue, with its rupee price', async ({ page, request }) => {
  // The live catalogue, not the seed (web KI-025): a used backend has more products than the seed, over several shelf pages,
  // and the spec never assumes which ones or how many. The admin spec's own rows come and go while the suite runs.
  const catalogue = (await allProducts(request)).filter((product) => !madeByTheAdminSpec(product))
  expect(catalogue.length).toBeGreaterThan(0)
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id
  const expected = catalogue.map(({ id, name, price }) => ({ id, name, price: money.format(price) })).sort(byId)

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
  const cards = await everyShelfCard(page)
  for (const card of cards) expect(card.price, card.name).toMatch(/^₹[\d,]+\.\d{2}$/)
  const shown = cards.filter((card) => !madeByTheAdminSpec(card))

  // Every product once, under its own name, with the price the server sent.
  expect(shown.sort(byId)).toEqual(expected)
})

test.describe('with the gateway unreachable', () => {
  test.use({ allowedConsoleErrors: [abortedRequestError] })

  test('the error state explains it and shows a reference for support', async ({ page }) => {
    await gatewayUnreachable(page)
    await page.goto('/')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Could not reach the server. Check your connection and try again.')
    // The id the page sent with the request: a UUID, on its own line.
    await expect(alert.locator('code')).toHaveText(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    await expect(page.getByRole('listitem')).toHaveCount(0)
  })
})

test('a catalogue larger than one backend page is read to the end', async ({ page }) => {
  // The backend pages `GET /api/products` (100 at most, id order, the next page in `Link`); the shelf joins every page so it can
  // sort the whole catalogue by name. A stand-in backend with 250 products, so the seed's 14 do not hide a missing page.
  const total = 250
  const asked: Array<{ page: number; size: number }> = []
  await page.route(/\/api\/products(\?.*)?$/, (route) => {
    const url = new URL(route.request().url())
    const number = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 50)
    asked.push({ page: number, size })
    const last = Math.ceil(total / size) - 1
    const items = Array.from({ length: Math.max(0, Math.min(size, total - number * size)) }, (_, index) => {
      const id = number * size + index + 1
      return {
        id,
        name: `Product ${String(id).padStart(3, '0')}`,
        description: 'A product',
        price: 100 + id,
        stockQuantity: 5,
        category: 'Test',
        imageUrl: null,
      }
    })
    const next =
      number < last
        ? `</api/products?page=${number + 1}&size=${size}>; rel="next"`
        : `</api/products?page=0&size=${size}>; rel="first"`
    return route.fulfill({ json: items, headers: { 'X-Total-Count': String(total), Link: next } })
  })

  await page.goto('/')

  await expect(page.getByText(`Showing 1–24 of ${total} products`)).toBeVisible()
  // 250 products at 100 a page: three requests, each for the largest page the backend allows.
  expect(asked).toEqual([
    { page: 0, size: 100 },
    { page: 1, size: 100 },
    { page: 2, size: 100 },
  ])
})

test.describe('a cold product page (web KI-027)', () => {
  // The real photos, not the stub: the photo's own request count is part of what is checked.
  test.use({ realImages: true })

  /** Any product with a photo, from the live catalogue (web KI-025): the photo is what the early request is for. */
  async function productWithPhoto(request: APIRequestContext) {
    const product = (await allProducts(request)).find(
      (candidate) => !madeByTheAdminSpec(candidate) && candidate.imageUrl,
    )
    expect(product, 'the catalogue has a product with a photo').toBeTruthy()
    return product as { id: number; name: string; imageUrl: string }
  }

  /** Every request the page makes for the product and for its photo, and every status they were answered with. */
  function countRequests(page: Page, { id, imageUrl }: { id: number; imageUrl: string }) {
    const counts = { product: 0, photo: 0, statuses: [] as number[] }
    const ours = (url: string) => [`/api/products/${id}`, imageUrl].includes(new URL(url).pathname)
    page.on('request', (sent) => {
      const { pathname } = new URL(sent.url())
      if (pathname === `/api/products/${id}`) counts.product += 1
      if (pathname === imageUrl) counts.photo += 1
    })
    page.on('response', (answer) => {
      if (ours(answer.url())) counts.statuses.push(answer.status())
    })
    return counts
  }

  test('asks for its product once, the early request index.html made, under the production CSP', async ({
    page,
    request,
  }) => {
    const product = await productWithPhoto(request)
    // The preview server sends no Content-Security-Policy; nginx does. This page load gets nginx's own policy, read from its
    // file, so the inline script must pass it here (the cspGuard fixture fails the test on any violation).
    const policy = /add_header\s+Content-Security-Policy\s+"([^"]*)"/.exec(
      readFileSync('nginx/security-headers.conf', 'utf8'),
    )?.[1]
    expect(policy, 'nginx/security-headers.conf has a Content-Security-Policy').toBeTruthy()
    await page.route(
      (url) => url.pathname === `/products/${product.id}`,
      async (route) => {
        const response = await route.fetch()
        await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy ?? '' } })
      },
    )
    const counts = countRequests(page, product)

    await page.goto(`/products/${product.id}`)

    await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
    await expect(page.getByRole('img', { name: product.name })).toBeVisible()
    // The app took index.html's request (so it ran: the policy allowed it) rather than asking again.
    const taken = await page.evaluate(
      () => (window as { __ecomdemoEarly?: { taken?: boolean } }).__ecomdemoEarly?.taken,
    )
    expect(taken).toBe(true)
    expect(counts.product).toBe(1)
  })

  test.describe('with no route set', () => {
    // The browser asks for /favicon.ico, which `vite preview` answers 404 (the app has none; nginx answers it with index.html).
    // Every other spec has a route set, which hides that request; here it shows. Only that 404 is let through: the product's
    // and the photo's answers are checked to be 200 below, so the allowance cannot hide them.
    test.use({ allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 404/] })

    test('downloads its photo once: the img uses what index.html preloaded', async ({ page, request }) => {
      // No page.route here, on purpose: Playwright turns the browser's cache off while any route is set, and then the img cannot
      // reuse the preload (measured: two photo requests with any route, one without).
      const product = await productWithPhoto(request)
      const counts = countRequests(page, product)

      await page.goto(`/products/${product.id}`)

      await expect(page.getByRole('img', { name: product.name })).toBeVisible()
      await expect
        .poll(() => page.evaluate(() => document.querySelector('link[rel="preload"][as="image"]') !== null))
        .toBe(true)
      expect(counts.product).toBe(1)
      expect(counts.photo).toBe(1)
      expect(counts.statuses).toEqual([200, 200])
    })
  })
})

test.describe('a cold shelf (web KI-042)', () => {
  test("asks for the catalogue's first page once, the early request index.html made, under the production CSP", async ({
    page,
  }) => {
    const policy = /add_header\s+Content-Security-Policy\s+"([^"]*)"/.exec(
      readFileSync('nginx/security-headers.conf', 'utf8'),
    )?.[1]
    expect(policy, 'nginx/security-headers.conf has a Content-Security-Policy').toBeTruthy()
    await page.route(
      (url) => url.pathname === '/',
      async (route) => {
        const response = await route.fetch()
        await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy ?? '' } })
      },
    )
    let firstPage = 0
    page.on('request', (sent) => {
      const url = new URL(sent.url())
      if (url.pathname === '/api/products' && url.searchParams.get('page') === '0') firstPage += 1
    })

    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    await expect(page.getByRole('article').first()).toBeVisible()
    const taken = await page.evaluate(
      () => (window as { __ecomdemoEarly?: { taken?: boolean } }).__ecomdemoEarly?.taken,
    )
    expect(taken).toBe(true)
    expect(firstPage).toBe(1)
  })

  test('fetches only the scripts index.html names (at most five modules), and tracing after the first paint', async ({
    page,
  }) => {
    const scripts: string[] = []
    page.on('request', (sent) => {
      if (sent.resourceType() === 'script') scripts.push(new URL(sent.url()).pathname)
    })

    await page.goto('/')
    await expect(page.getByRole('article').first()).toBeVisible()

    // What index.html asks for up front: theme-init.js, the entry, and the modules it preloads. The only other script on the shelf
    // is tracing's chunk, after the first paint (web KI-033); forms and later pages load when they are used (check-budgets.mjs).
    const named = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[rel="modulepreload"]')].map(
        (element) => new URL(element instanceof HTMLScriptElement ? element.src : element.href).pathname,
      ),
    )
    const modules = named.filter((path) => path.startsWith('/assets/'))
    expect(modules.length).toBeLessThanOrEqual(5)
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.tracing)).toBe('on')
    for (const path of scripts.filter((path) => !/^\/assets\/tracing-[\w-]+\.js$/.test(path))) expect(named, path).toContain(path)
  })
})
