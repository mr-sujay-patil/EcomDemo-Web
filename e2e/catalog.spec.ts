import { expect, test } from './fixtures'
import { abortedRequestError, gatewayUnreachable } from './screens'

// Assumed data: the backend's seed migration (catalog-service V2__seed_products.sql, ids 1–10).
// Other rows may exist (backend smoke tests add some), so the spec never assumes a total.
const seededProducts = [
  'Mechanical Keyboard',
  'Wireless Mouse',
  '27" 4K Monitor',
  'Noise-Cancelling Headphones',
  'USB-C Hub',
  'Laptop Stand',
  'Webcam 1080p',
  'Desk Mat',
  'Portable SSD 1TB',
  'Laptop Sleeve 16"',
]

test('the product list shows the seeded products with rupee prices', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
  for (const name of seededProducts) {
    const item = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })
    await expect(item).toBeVisible()
    await expect(item).toContainText(/₹[\d,]+\.\d{2}/)
  }
  await expect(page.getByRole('status')).toHaveCount(0)
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
