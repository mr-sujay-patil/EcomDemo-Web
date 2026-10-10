import type { APIRequestContext } from '@playwright/test'
import { expect, test } from './fixtures'
import { allProducts, madeByTheAdminSpec, findOnShelf, type Product } from './live-data'
import { notFoundResponseError } from './screens'

// The products come from the live catalogue, not the seed's ids or its first shelf page (web KI-025): one whose `imageUrl`
// names an image, and one with none (the seed has both; a product created later has none).
async function productsByImage(request: APIRequestContext) {
  const products = (await allProducts(request))
    .filter((product) => !madeByTheAdminSpec(product))
    .sort((a, b) => a.id - b.id)
  const withImage = products.find((product) => product.imageUrl)
  const withoutImage = products.find((product) => !product.imageUrl)
  expect(withImage, 'the backend needs a product with an image').toBeDefined()
  expect(withoutImage, 'the backend needs a product without an image').toBeDefined()
  return { withImage: withImage!, withoutImage: withoutImage! }
}

/** The path the page fetches the product's image from: its `imageUrl`, on this origin. */
const imagePath = (product: Product) => new URL(product.imageUrl!, 'http://origin.invalid').pathname

test.describe('product images', () => {
  test.use({ realImages: true })

  test('a product with an image shows it, fetched from the gateway without a token', async ({ page, request }) => {
    const { withImage: product } = await productsByImage(request)
    // Served by the gateway, from the catalogue's image endpoint.
    expect(imagePath(product)).toBe(`/api/products/${product.id}/image`)
    const imageRequest = page.waitForResponse((response) => new URL(response.url()).pathname === imagePath(product))

    await page.goto(`/products/${product.id}`)

    const response = await imageRequest
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/')
    expect(response.request().headers()['authorization']).toBeUndefined()
    await expect(page.getByRole('img', { name: product.name })).toBeVisible()
    await expect(page.getByText('Photo to come')).toHaveCount(0)
  })

  test('the shelf shows the images of the products that have one, and a well for the rest', async ({
    page,
    request,
  }) => {
    const { withImage, withoutImage } = await productsByImage(request)

    await page.goto('/')
    const pictured = await findOnShelf(page, withImage)
    await expect(pictured.getByRole('img', { name: withImage.name })).toBeVisible()

    await page.goto('/')
    const unpictured = await findOnShelf(page, withoutImage)
    await expect(unpictured.getByRole('img')).toHaveCount(0)
    await expect(unpictured.getByText('Photo to come')).toBeVisible()
  })

  test.describe('an image that cannot be loaded', () => {
    // The browser logs the stubbed 404 itself, even though the app handles it.
    test.use({ allowedConsoleErrors: [notFoundResponseError] })

    test('falls back to the well', async ({ page, request }) => {
      const { withImage: product } = await productsByImage(request)
      await page.route(
        (url) => url.pathname === imagePath(product),
        (route) => route.fulfill({ status: 404, json: { status: 404, message: 'x' } }),
      )
      await page.goto(`/products/${product.id}`)

      await expect(page.getByText('Photo to come')).toBeVisible()
      await expect(page.getByRole('img', { name: product.name })).toHaveCount(0)
    })
  })
})

test.describe('fonts', () => {
  test('are served by this app as font/woff2, and the preloaded face is fetched', async ({ page, baseURL }) => {
    const fonts: { url: string; type: string | undefined }[] = []
    page.on('response', (response) => {
      if (response.url().endsWith('.woff2'))
        fonts.push({ url: response.url(), type: response.headers()['content-type'] })
    })

    await page.goto('/')
    await expect(page.getByRole('listitem').first()).toBeVisible()

    expect(fonts.length).toBeGreaterThanOrEqual(2)
    for (const font of fonts) {
      // The origin the suite is pointed at: the preview server, or the container (`npm run e2e:docker`).
      expect(new URL(font.url).origin, 'self-hosted: no Google Fonts, no CDN').toBe(new URL(baseURL ?? '').origin)
      expect(font.type).toBe('font/woff2')
    }
    // One face is preloaded (the headings): a second one slowed the product page's LCP (docs/performance.md).
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(1)
  })
})

test.describe('the theme', () => {
  const background = (page: import('@playwright/test').Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  test('follows the system until the button is used, then keeps the choice across a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    const light = await background(page)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)

    await page.emulateMedia({ colorScheme: 'dark' })
    const system = await background(page)
    expect(system, 'with no choice made the page follows the system setting').not.toBe(light)

    // Auto, then Light, then Dark.
    await page.getByRole('button', { name: /^Theme: Auto/ }).click()
    await page.getByRole('button', { name: /^Theme: Light/ }).click()
    await expect(page.getByRole('button', { name: /^Theme: Dark/ })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.emulateMedia({ colorScheme: 'light' })
    expect(await background(page), 'an explicit Dark beats the system Light').toBe(system)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: /^Theme: Dark/ })).toBeVisible()
  })

  test('applies a saved choice before the page paints', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ecomdemo-theme', 'dark')
    })
    await page.emulateMedia({ colorScheme: 'light' })

    await page.goto('/about')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
