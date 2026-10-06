import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { notFoundResponseError } from './screens'

// Assumed data: the backend's seed migration (catalog-service V2__seed_products.sql, ids 1-10).
// Other rows may exist (backend smoke tests add some), so these specs pick seeded products and never assume a total.
const accessories = ['USB-C Hub', 'Laptop Stand', 'Desk Mat', 'Laptop Sleeve 16"']

/** A category chip, found by its words ("Accessories"); its count follows ("Accessories 4"). */
const categoryChip = (page: Page, label: string) =>
  page.getByRole('group', { name: 'Category' }).getByRole('button', { name: new RegExp(`^${label}\\b`) })

const productNames = (page: Page) => page.getByRole('heading', { level: 2 }).allTextContents()

/** The displayed prices, as numbers. Only the test reads them back; the app never does arithmetic on prices. */
async function displayedPrices(page: Page): Promise<number[]> {
  const texts = await page.getByRole('listitem').locator('.ed-price-now').allTextContents()
  return texts.map((text) => Number(text.replace(/[^\d.]/g, '')))
}

test.describe('filter, sort and pages live in the URL', () => {
  test('filtering by category updates the URL, and a reload keeps it', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('listitem').first()).toBeVisible()

    await categoryChip(page, 'Accessories').click()

    await expect(page).toHaveURL(/\?category=ACCESSORIES$/)
    for (const name of accessories)
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Mechanical Keyboard' })).toHaveCount(0)

    await page.reload()

    await expect(categoryChip(page, 'Accessories')).toHaveAttribute('aria-pressed', 'true')
    for (const name of accessories)
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Mechanical Keyboard' })).toHaveCount(0)
  })

  test('a shared link opens the filtered shelf', async ({ page }) => {
    await page.goto('/?category=AUDIO&sort=price-desc')

    await expect(page.getByRole('heading', { level: 2, name: 'Noise-Cancelling Headphones' })).toBeVisible()
    await expect(categoryChip(page, 'Audio')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price-desc')
  })

  test('sorting by price orders the shelf, both ways, and survives a reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('listitem').first()).toBeVisible()

    await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price')
    await expect(page).toHaveURL(/\?sort=price$/)
    const ascending = await displayedPrices(page)
    expect(ascending.length).toBeGreaterThan(5)
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b))

    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price')
    await expect(page.getByRole('listitem').first()).toBeVisible()
    expect(await displayedPrices(page)).toEqual(ascending)

    await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price-desc')
    await expect(page).toHaveURL(/\?sort=price-desc$/)
    const descending = await displayedPrices(page)
    expect(descending).toEqual([...descending].sort((a, b) => b - a))
  })

  test('the default sort is by name', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('listitem').first()).toBeVisible()

    const names = await productNames(page)

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')))
  })
})

test.describe('pages', () => {
  // The seeded catalogue holds fewer than 24 products, so the pager never shows against it. The
  // browser behaviour (links, URL, reload) is checked with a stubbed list of 30; the page logic
  // itself is unit-tested (shelf.test.ts) against the same numbers.
  test.beforeEach(async ({ page }) => {
    const thirty = Array.from({ length: 30 }, (_, index) => ({
      id: 500 + index,
      name: `Stub ${String(index + 1).padStart(2, '0')}`,
      description: 'Stubbed for the pager test',
      price: 100 + index,
      stockQuantity: 10,
      category: 'STUB',
      imageUrl: null,
    }))
    await page.route('**/api/products', (route) => route.fulfill({ json: thirty }))
  })

  test('next page shows the rest, the URL says so, and a reload stays on it', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Showing 1–24 of 30 products')).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(24)

    await page.getByRole('link', { name: 'Next page' }).click()

    await expect(page).toHaveURL(/\?page=2$/)
    await expect(page.getByText('Showing 25–30 of 30 products')).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(6)
    await expect(page.getByRole('link', { name: 'Next page' })).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('Showing 25–30 of 30 products')).toBeVisible()

    await page.getByRole('link', { name: 'Previous page' }).click()
    await expect(page.getByText('Showing 1–24 of 30 products')).toBeVisible()
  })
})

test.describe('the product page', () => {
  test('opens from the shelf by link, and the back button returns to the same filter', async ({ page }) => {
    await page.goto('/?category=PERIPHERALS')
    await page.getByRole('link', { name: 'Mechanical Keyboard' }).click()

    await expect(page).toHaveURL('/products/1')
    await expect(page.getByRole('heading', { level: 1, name: 'Mechanical Keyboard' })).toBeVisible()
    await expect(page.getByText('PERIPHERALS', { exact: true })).toBeVisible()
    await expect(page.getByText(/₹8,999\.00/)).toBeVisible()
    await expect(page.getByText(/^(\d+ in stock|Only \d+ left|Out of stock)$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled()

    await page.goBack()

    await expect(page).toHaveURL(/\?category=PERIPHERALS$/)
    await expect(categoryChip(page, 'Peripherals')).toHaveAttribute('aria-pressed', 'true')
  })

  test('opens by deep URL, with the product from the backend', async ({ page }) => {
    await page.goto('/products/4')

    await expect(page.getByRole('heading', { level: 1, name: 'Noise-Cancelling Headphones' })).toBeVisible()
    await expect(page.getByText('AUDIO', { exact: true })).toBeVisible()
    await expect(page.getByText('₹14,999.00')).toBeVisible()
  })

  test('hovering a product on the shelf loads it before it is opened', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('link', { name: 'Mechanical Keyboard' })
    await expect(link).toBeVisible()

    const prefetch = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/products/1')
    await link.hover()
    await prefetch

    await link.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Mechanical Keyboard' })).toBeVisible()
  })

  test.describe('for a product that is not there', () => {
    test.use({ allowedConsoleErrors: [notFoundResponseError] })

    test('says "No longer available" and links back to the shelf', async ({ page }) => {
      await page.goto('/products/999999999')

      await expect(page.getByRole('heading', { level: 1, name: 'No longer available' })).toBeVisible()
      await page.getByRole('link', { name: 'Back to all products' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    })
  })

  test('says "No longer available" for an id that cannot be a product, without asking the backend', async ({
    page,
  }) => {
    let asked = false
    await page.route('**/api/products/**', async (route) => {
      asked = true
      await route.continue()
    })

    await page.goto('/products/abc')

    await expect(page.getByRole('heading', { level: 1, name: 'No longer available' })).toBeVisible()
    expect(asked).toBe(false)
  })
})

test.describe('error and retry', () => {
  // The browser logs the stubbed 503 itself, even though the app shows it as an error state.
  test.use({ allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 503/] })

  test('the Retry button loads the shelf after the gateway comes back', async ({ page }) => {
    let up = false
    await page.route('**/api/products', (route) =>
      up
        ? route.continue()
        : route.fulfill({
            status: 503,
            headers: { 'X-Correlation-Id': 'e2e-down-0001' },
            json: { status: 503, message: 'The catalogue is down for a moment.' },
          }),
    )
    await page.goto('/')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('The catalogue is down for a moment.')
    await expect(alert).toContainText('e2e-down-0001')

    up = true
    await alert.getByRole('button', { name: 'Retry' }).click()

    await expect(page.getByRole('heading', { level: 2, name: 'Mechanical Keyboard' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
