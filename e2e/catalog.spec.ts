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
