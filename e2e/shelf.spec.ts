import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { allProducts, everyShelfCard, madeByTheAdminSpec, shelfCount, type Product } from './live-data'
import { notFoundResponseError, productListUrl } from './screens'

// The data comes from the live catalogue, not the seed (web KI-025): a used backend has other products, and a category can run
// past one shelf page. The specs never assume which products there are or how many.

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/**
 * The category with the most products (ties: A to Z), and its products. The admin spec's own rows (category "E2E") come and go
 * while the suite runs, so they are left out.
 */
async function busiestCategory(request: APIRequestContext): Promise<{ category: string; products: Product[] }> {
  const byCategory = new Map<string, Product[]>()
  for (const product of await allProducts(request)) {
    const category = product.category?.trim()
    if (!category || madeByTheAdminSpec(product) || category === 'E2E') continue
    byCategory.set(category, [...(byCategory.get(category) ?? []), product])
  }
  const [category, products] = [...byCategory].sort(
    ([a, left], [b, right]) => right.length - left.length || a.localeCompare(b, 'en'),
  )[0] ?? ['', []]
  expect(category, 'the backend needs a product with a category').not.toBe('')
  return { category, products }
}

/** A category's words on its chip: the catalogue stores `AUDIO`, the shelf says "Audio" (as `categoryLabel` in the app). */
const chipLabel = (category: string) => category.charAt(0) + category.slice(1).toLowerCase()

/** A category chip, found by its words ("Accessories"); its count follows ("Accessories 4"). */
const categoryChip = (page: Page, label: string) =>
  page
    .getByRole('group', { name: 'Category' })
    .getByRole('button', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) })

/** The ids of every card on the shelf, across its pages, without the admin spec's rows. */
const shelfIds = async (page: Page) =>
  (await everyShelfCard(page))
    .filter((card) => !madeByTheAdminSpec(card))
    .map((card) => card.id)
    .sort((a, b) => a - b)

const productNames = (page: Page) => page.getByRole('heading', { level: 2 }).allTextContents()

/** The displayed prices, as numbers. Only the test reads them back; the app never does arithmetic on prices. */
async function displayedPrices(page: Page): Promise<number[]> {
  const texts = await page.getByRole('listitem').locator('.ed-price-now').allTextContents()
  return texts.map((text) => Number(text.replace(/[^\d.]/g, '')))
}

test.describe('filter, sort and pages live in the URL', () => {
  test('filtering by category updates the URL, and a reload keeps it', async ({ page, request }) => {
    const { category, products } = await busiestCategory(request)
    // Exactly the category's products, every one of them and no other, on however many pages they take.
    const expected = products.map((product) => product.id).sort((a, b) => a - b)
    await page.goto('/')
    await expect(page.getByRole('listitem').first()).toBeVisible()

    await categoryChip(page, chipLabel(category)).click()

    await expect(page).toHaveURL(`/?${new URLSearchParams({ category }).toString()}`)
    expect(await shelfIds(page)).toEqual(expected)

    await page.reload()

    await expect(categoryChip(page, chipLabel(category))).toHaveAttribute('aria-pressed', 'true')
    expect(await shelfIds(page)).toEqual(expected)
  })

  test('a shared link opens the filtered shelf', async ({ page, request }) => {
    const { category, products } = await busiestCategory(request)
    // The shelf's order for "Price (high to low)": price, then name, then id.
    const [priciest] = [...products].sort(
      (a, b) => b.price - a.price || a.name.localeCompare(b.name, 'en') || a.id - b.id,
    )

    await page.goto(`/?${new URLSearchParams({ category, sort: 'price-desc' }).toString()}`)

    await expect(page.getByRole('article').first().getByRole('heading', { level: 2 })).toHaveText(priciest!.name)
    await expect(categoryChip(page, chipLabel(category))).toHaveAttribute('aria-pressed', 'true')
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
    await page.route(productListUrl, (route) => route.fulfill({ json: thirty }))
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
  test('opens from the shelf by link, and the back button returns to the same filter', async ({ page, request }) => {
    const { category, products } = await busiestCategory(request)
    const filtered = `/?${new URLSearchParams({ category }).toString()}`
    await page.goto(filtered)
    // The first product of the filtered shelf, whichever it is, checked against what the backend says about it.
    const link = page.getByRole('article').first().getByRole('heading', { level: 2 }).getByRole('link')
    const path = (await link.getAttribute('href')) ?? ''
    const product = products.find((candidate) => path === `/products/${candidate.id}`)
    expect(product, `${path} is one of the ${category} products`).toBeDefined()
    await link.click()

    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { level: 1, name: product!.name, exact: true })).toBeVisible()
    await expect(page.getByText(category, { exact: true })).toBeVisible()
    await expect(page.getByText(money.format(product!.price))).toBeVisible()
    await expect(page.getByText(/^(\d+ in stock|Only \d+ left|Out of stock)$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled()

    await page.goBack()

    await expect(page).toHaveURL(filtered)
    await expect(categoryChip(page, chipLabel(category))).toHaveAttribute('aria-pressed', 'true')
  })

  test('opens by deep URL, with the product from the backend', async ({ page, request }) => {
    const { category, products } = await busiestCategory(request)
    const product = products[0]!

    await page.goto(`/products/${product.id}`)

    await expect(page.getByRole('heading', { level: 1, name: product.name, exact: true })).toBeVisible()
    await expect(page.getByText(category, { exact: true })).toBeVisible()
    await expect(page.getByText(money.format(product.price))).toBeVisible()
  })

  test('hovering a product on the shelf loads it before it is opened', async ({ page }) => {
    await page.goto('/')
    // The product the shelf shows first, whichever it is (the live catalogue, not the seed: web KI-025).
    const link = page.getByRole('article').first().getByRole('heading', { level: 2 }).getByRole('link')
    await expect(link).toBeVisible()
    const name = (await link.textContent()) ?? ''
    const path = (await link.getAttribute('href')) ?? ''
    expect(path).toMatch(/^\/products\/\d+$/)

    const prefetch = page.waitForRequest((request) => new URL(request.url()).pathname === `/api${path}`)
    await link.hover()
    await prefetch

    await link.click()
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
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
    await page.route(productListUrl, (route) =>
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

    // The shelf, with whatever the live catalogue holds (web KI-025).
    await expect(shelfCount(page)).toBeVisible()
    await expect(page.getByRole('article').first()).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
