import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { createAccount, findOnShelf, orderOverTheLimit, password } from './live-data'

// Real accounts and the real order saga. The order is one that the saga cancels (its total is above the payment limit), so
// no stock is taken for good; the product and the quantity come from the live catalogue, not the seed (web KI-025,
// e2e/live-data.ts). A full page load signs the person out: a second person reaches an order by signing in with `?next=`, the
// way a link in an email would take them there.

async function signIn(page: Page, username: string, next = '/') {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/**
 * Signs in a new account, puts in the cart enough of one product to pass the payment limit and places the order; returns the
 * order's id and the product's name.
 */
async function placeCancelledOrder(page: Page, request: APIRequestContext) {
  const { product, quantity } = await orderOverTheLimit(request)
  const username = await createAccount(request)
  await signIn(page, username)
  await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
  const card = await findOnShelf(page, product)
  for (let count = 1; count <= quantity; count += 1) {
    await card.getByRole('button', { name: /^(Add to cart|In your cart)/ }).click()
    await expect(card.getByRole('button', { name: `In your cart (${count})` })).toBeVisible()
  }
  await page.getByRole('banner').getByRole('link', { name: /^Cart/ }).click()
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByText('Your order was cancelled')).toBeVisible({ timeout: 30_000 })
  const id = /\/orders\/(\d+)$/.exec(page.url())?.[1]
  expect(id).toBeDefined()
  return { username, id: id!, productName: product.name }
}

async function openFromMenu(page: Page, link: string) {
  await page.getByRole('button', { name: /^Account:/ }).click()
  await page.getByRole('link', { name: link, exact: true }).click()
}

test.describe('orders', () => {
  test('my orders lists an order placed earlier, and its detail opens', async ({ page, request }) => {
    const { id, productName } = await placeCancelledOrder(page, request)

    await openFromMenu(page, 'My orders')

    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible()
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: `Order ${id}` }) })
    await expect(row).toContainText('Cancelled')
    await expect(row).toContainText('Payment declined')

    await row.getByRole('link', { name: `Order ${id}` }).click()

    await expect(page).toHaveURL(new RegExp(`/orders/${id}$`))
    await expect(page.getByRole('heading', { level: 1, name: `Order #${id}` })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Items in this order' })).toContainText(productName)
  })

  test.describe("someone else's order", () => {
    // The browser logs a 403 and a 404 response itself, even though the app handles them.
    test.use({ allowedConsoleErrors: [/Failed to load resource: the server responded with a status of (403|404)/] })

    test('shows "Order not found" for another customer’s order and for one that does not exist', async ({
      page,
      request,
      browser,
    }) => {
      const { id, productName } = await placeCancelledOrder(page, request)

      const other = await browser.newContext()
      const otherPage = await other.newPage()
      // The second person gets the same console guard through the same rules: any other error fails the test below.
      const problems: string[] = []
      otherPage.on('pageerror', (error) => problems.push(error.message))
      await signIn(otherPage, await createAccount(request), `/orders/${id}`)

      await expect(otherPage.getByRole('heading', { level: 1, name: 'Order not found' })).toBeVisible()
      await expect(otherPage.getByText('Payment declined')).toHaveCount(0)
      await expect(otherPage.getByText(productName)).toHaveCount(0)

      await signIn(otherPage, await createAccount(request), '/orders/999999999')
      await expect(otherPage.getByRole('heading', { level: 1, name: 'Order not found' })).toBeVisible()

      expect(problems).toEqual([])
      await other.close()
    })
  })

  test('a customer with no orders sees the empty state', async ({ page, request }) => {
    await signIn(page, await createAccount(request))
    await openFromMenu(page, 'My orders')

    await expect(page.getByText('You have not placed an order yet')).toBeVisible()
  })
})

test.describe('profile', () => {
  test('the full name can be changed, and the header follows', async ({ page, request }) => {
    await signIn(page, await createAccount(request))
    await openFromMenu(page, 'Account')

    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
    await expect(page.getByLabel('Full name')).toHaveValue('E2E Person')
    await expect(page.getByText(/no way to change your password/i)).toBeVisible()

    await page.getByLabel('Full name').fill('Meera Rao')
    await page.getByRole('button', { name: 'Save name' }).click()

    await expect(page.getByText('Your name is updated.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account: Meera' })).toBeVisible()
  })

  test('a name over 100 characters is refused on the field', async ({ page, request }) => {
    await signIn(page, await createAccount(request))
    await openFromMenu(page, 'Account')

    await page.getByLabel('Full name').fill('x'.repeat(101))
    await page.getByRole('button', { name: 'Save name' }).click()

    await expect(page.getByText('Use at most 100 characters.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
  })
})
