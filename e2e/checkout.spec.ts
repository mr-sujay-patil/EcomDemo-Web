import type { APIRequestContext, Locator, Page } from '@playwright/test'
import type { components as AppApi } from '../src/api/generated/app'
import type { components as CatalogApi } from '../src/api/generated/catalog'
import type { components as CustomerApi } from '../src/api/generated/customer'
import { expect, test } from './fixtures'

// Real accounts, the real cart and the real order saga (stock, then simulated payment). A full page load signs the
// person out, so every move below is a click. Each confirmed order takes real stock (the API cannot give it back):
// the confirmed purchase is one Desk Mat, the cheapest of the well-stocked products.
const password = 'correct horse battery'

async function createAccount(request: APIRequestContext) {
  const username = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const response = await request.post('/api/customers/register', {
    data: { username, password, fullName: 'E2E Person' },
  })
  expect(response.status()).toBe(201)
  return username
}

async function signedInShelf(page: Page, request: APIRequestContext, username?: string) {
  username ??= await createAccount(request)
  await page.goto('/sign-in')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
}

const card = (page: Page, name: string): Locator =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name }) })

async function addFromShelf(page: Page, name: string, times = 1) {
  const addButton = card(page, name).getByRole('button', { name: /^(Add to cart|In your cart)/ })
  for (let count = 0; count < times; count += 1) {
    await addButton.click()
    await expect(card(page, name).getByRole('button', { name: `In your cart (${count + 1})` })).toBeVisible()
  }
}

type Product = CatalogApi['schemas']['ProductResponse']

/** The whole live catalogue: the pinned backend pages `GET /api/products` (web KI-030), so every page is read. */
async function allProducts(request: APIRequestContext): Promise<Product[]> {
  const size = 100
  const products: Product[] = []
  for (let page = 0; ; page += 1) {
    const response = await request.get(`/api/products?page=${page}&size=${size}`)
    expect(response.status()).toBe(200)
    const batch = (await response.json()) as Product[]
    products.push(...batch)
    if (batch.length < size) return products
  }
}

// Specs that run at the same time take stock from these (a confirmed Desk Mat; two keyboards held until the saga cancels the
// order), so their level can change while this test reads it. The admin spec's own products ("E2E product …", "E2E import …")
// are deleted while the suite runs.
const stockTakenElsewhere = new Set(['Desk Mat', 'Mechanical Keyboard'])
const changesWhileWeRun = (product: Product) => stockTakenElsewhere.has(product.name) || product.name.startsWith('E2E ')

/**
 * The in-stock product with the fewest left, as the live backend has it now. The suite runs on a fresh stack in CI and on a used
 * one locally, where checkouts have drained the seed (web KI-020), so a test that needs "a few in stock" finds it instead of
 * assuming a seeded product still has its seeded level. Below 99, so the cart's stepper (max 99) can go one above it.
 */
async function productWithFewestInStock(request: APIRequestContext): Promise<Product> {
  const candidates = (await allProducts(request))
    .filter((product) => product.stockQuantity >= 1 && product.stockQuantity < 99)
    .filter((product) => !changesWhileWeRun(product))
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
  expect(candidates.length, 'the backend needs a product with 1 to 98 in stock').toBeGreaterThan(0)
  return candidates[0]!
}

/** Puts a line in the person's server-side cart through the API (adding does not check stock), before the browser signs in. */
async function putInCart(request: APIRequestContext, username: string, productId: number, quantity: number) {
  const login = await request.post('/api/auth/login', {
    data: { username, password } satisfies CustomerApi['schemas']['LoginRequest'],
  })
  expect(login.status()).toBe(200)
  const { accessToken } = (await login.json()) as CustomerApi['schemas']['TokenResponse']
  const added = await request.post('/api/cart/items', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { productId, quantity } satisfies AppApi['schemas']['AddCartItemRequest'],
  })
  expect(added.status()).toBe(200)
}

async function openCart(page: Page) {
  await page.getByRole('banner').getByRole('link', { name: /^Cart/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
}

test.describe('checkout', () => {
  test('a purchase is confirmed, and the cart is empty afterwards', async ({ page, request }) => {
    await signedInShelf(page, request)
    await addFromShelf(page, 'Desk Mat')
    await openCart(page)

    await page.getByRole('button', { name: 'Place order' }).click()

    await expect(page).toHaveURL(/\/orders\/\d+$/)
    await expect(page.getByRole('region', { name: 'Items in this order' })).toContainText('Desk Mat')
    // 201 is "received": the page waits for the saga before it says confirmed.
    await expect(page.getByText('Your order is confirmed.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('region', { name: 'Order progress' })).toContainText('Confirmed')

    await page.getByRole('banner').getByRole('link', { name: /^Cart/ }).click()
    await expect(page.getByText('Your cart is empty')).toBeVisible()
  })

  test('an order above 10 000 is cancelled with the reason, and its items can be added again', async ({
    page,
    request,
  }) => {
    await signedInShelf(page, request)
    await addFromShelf(page, 'Mechanical Keyboard', 2)
    await openCart(page)

    await page.getByRole('button', { name: 'Place order' }).click()

    await expect(page.getByText('Your order was cancelled')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Payment declined: .* exceeds the limit of 10000\.00/).first()).toBeVisible()
    await expect(page.getByText('Your order is confirmed.')).toHaveCount(0)

    await page.getByRole('button', { name: 'Add these items to my cart again' }).click()

    await expect(page).toHaveURL('/cart')
    const line = page.getByRole('listitem').filter({ hasText: 'Mechanical Keyboard' })
    await expect(line.getByRole('group', { name: /^Quantity of/ }).getByRole('status')).toHaveText('2')
  })

  test.describe('a refused order', () => {
    // The browser logs a 409 response itself, even though the app handles it.
    test.use({ allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 409/] })

    test('a quantity above stock is refused up front, by its line, and the cart is kept', async ({ page, request }) => {
      // The test arranges its own precondition: whatever product has the fewest in stock right now, with exactly that many in
      // the cart. Asking for one more is refused before any order exists, so no stock is taken.
      const product = await productWithFewestInStock(request)
      const stock = product.stockQuantity
      const username = await createAccount(request)
      await putInCart(request, username, product.id, stock)
      await signedInShelf(page, request, username)
      await openCart(page)
      const line = page
        .getByRole('list', { name: 'Items in your cart' })
        .getByRole('listitem')
        .filter({ hasText: product.name })
      await expect(line.getByRole('status')).toHaveText(String(stock))
      await line.getByRole('button', { name: 'Increase' }).click()
      await expect(line.getByRole('status')).toHaveText(String(stock + 1))

      await page.getByRole('button', { name: 'Place order' }).click()

      await expect(line.getByRole('alert')).toContainText(
        `Insufficient stock for '${product.name}': requested ${stock + 1}, available ${stock}`,
      )
      await expect(page).toHaveURL('/cart')

      await line.getByRole('button', { name: `Lower to ${stock}` }).click()

      await expect(line.getByRole('status')).toHaveText(String(stock))
      await expect(line.getByRole('alert')).toHaveCount(0)
    })
  })

  test('an empty cart has nothing to check out', async ({ page, request }) => {
    await signedInShelf(page, request)
    await openCart(page)

    await expect(page.getByText('Your cart is empty')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Place order' })).toHaveCount(0)
  })
})
