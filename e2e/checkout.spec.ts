import type { APIRequestContext, Locator, Page } from '@playwright/test'
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

async function signedInShelf(page: Page, request: APIRequestContext) {
  const username = await createAccount(request)
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
      await signedInShelf(page, request)
      // Seeded with two in stock: asking for three is refused before any order exists.
      await addFromShelf(page, 'Laptop Sleeve 16"')
      await openCart(page)
      const line = page.getByRole('listitem').filter({ hasText: 'Laptop Sleeve' })
      await line.getByRole('button', { name: 'Increase' }).click()
      await line.getByRole('button', { name: 'Increase' }).click()
      await expect(line.getByRole('status')).toHaveText('3')

      await page.getByRole('button', { name: 'Place order' }).click()

      await expect(line.getByRole('alert')).toContainText(
        "Insufficient stock for 'Laptop Sleeve 16\"': requested 3, available 2",
      )
      await expect(page).toHaveURL('/cart')

      await line.getByRole('button', { name: 'Lower to 2' }).click()

      await expect(line.getByRole('status')).toHaveText('2')
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
