import { expect, test } from './fixtures'
import { notFoundResponseError } from './screens'

// Assumed data: the backend's seed (phase-34-complete): products 1 to 8 have an image, 9 and 10 have none.
// A product created later has none either, so these specs name seeded ids.

test.describe('product images', () => {
  test.use({ realImages: true })

  test('a product with an image shows it, fetched from the gateway without a token', async ({ page }) => {
    const imageRequest = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/products/1/image',
    )

    await page.goto('/products/1')

    const response = await imageRequest
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/')
    expect(response.request().headers()['authorization']).toBeUndefined()
    await expect(page.getByRole('img', { name: 'Mechanical Keyboard' })).toBeVisible()
    await expect(page.getByText('Photo to come')).toHaveCount(0)
  })

  test('the shelf shows the images of the products that have one, and a well for the rest', async ({ page }) => {
    await page.goto('/')
    const keyboard = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Mechanical Keyboard', exact: true }) })
    const ssd = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Portable SSD 1TB', exact: true }) })

    await expect(keyboard.getByRole('img', { name: 'Mechanical Keyboard' })).toBeVisible()
    await expect(ssd.getByRole('img')).toHaveCount(0)
    await expect(ssd.getByText('Photo to come')).toBeVisible()
  })

  test.describe('an image that cannot be loaded', () => {
    // The browser logs the stubbed 404 itself, even though the app handles it.
    test.use({ allowedConsoleErrors: [notFoundResponseError] })

    test('falls back to the well', async ({ page }) => {
      await page.route('**/api/products/1/image', (route) =>
        route.fulfill({ status: 404, json: { status: 404, message: 'x' } }),
      )
      await page.goto('/products/1')

      await expect(page.getByText('Photo to come')).toBeVisible()
      await expect(page.getByRole('img', { name: 'Mechanical Keyboard' })).toHaveCount(0)
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
