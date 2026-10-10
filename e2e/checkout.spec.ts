import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  createAccount,
  findOnShelf,
  orderOverTheLimit,
  password,
  productToBuy,
  productWithFewestInStock,
  putInCart,
  type Product,
} from './live-data'

// Real accounts, the real cart and the real order saga (stock, then simulated payment). A full page load signs the
// person out, so every move below is a click. Each confirmed order takes real stock (the API cannot give it back), so the
// products come from the live catalogue, not the seed (web KI-025, e2e/live-data.ts): the confirmed purchase is one of the
// product with the most in stock; the cancelled order holds its stock only until the saga cancels it.

async function signedInShelf(page: Page, request: APIRequestContext, username?: string) {
  username ??= await createAccount(request)
  await page.goto('/sign-in')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
}

/** Adds the product from its card on the shelf, `times` clicks, on whichever shelf page it is. */
async function addFromShelf(page: Page, product: Product, times = 1) {
  const card = await findOnShelf(page, product)
  const addButton = card.getByRole('button', { name: /^(Add to cart|In your cart)/ })
  for (let count = 0; count < times; count += 1) {
    await addButton.click()
    await expect(card.getByRole('button', { name: `In your cart (${count + 1})` })).toBeVisible()
  }
}

async function openCart(page: Page) {
  await page.getByRole('banner').getByRole('link', { name: /^Cart/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
}

test.describe('checkout', () => {
  test('a purchase is confirmed, and the cart is empty afterwards', async ({ page, request }) => {
    const product = await productToBuy(request)
    await signedInShelf(page, request)
    await addFromShelf(page, product)
    await openCart(page)

    await page.getByRole('button', { name: 'Place order' }).click()

    await expect(page).toHaveURL(/\/orders\/\d+$/)
    await expect(page.getByRole('region', { name: 'Items in this order' })).toContainText(product.name)
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
    const { product, quantity } = await orderOverTheLimit(request)
    await signedInShelf(page, request)
    await addFromShelf(page, product, quantity)
    await openCart(page)

    await page.getByRole('button', { name: 'Place order' }).click()

    await expect(page.getByText('Your order was cancelled')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Payment declined: .* exceeds the limit of 10000\.00/).first()).toBeVisible()
    await expect(page.getByText('Your order is confirmed.')).toHaveCount(0)

    await page.getByRole('button', { name: 'Add these items to my cart again' }).click()

    await expect(page).toHaveURL('/cart')
    const line = page.getByRole('listitem').filter({ hasText: product.name })
    await expect(line.getByRole('group', { name: /^Quantity of/ }).getByRole('status')).toHaveText(String(quantity))
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
