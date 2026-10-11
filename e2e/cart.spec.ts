import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Real accounts and the real cart API (see auth.spec.ts for why). A full page load signs the person out, so every
// move below is a click. Money is compared as text with what the server last sent: the app never adds anything up.
const password = 'correct horse battery'
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

async function createAccount(request: APIRequestContext) {
  const username = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const response = await request.post('/api/customers/register', {
    data: { username, password, fullName: 'E2E Person' },
  })
  expect(response.status()).toBe(201)
  return username
}

async function signIn(page: Page, username: string) {
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** The `totalAmount` of the last cart answer the page received, as the summary must show it. */
function lastTotal(page: Page) {
  let total = 0
  page.on('response', async (response) => {
    if (!response.url().includes('/api/cart') || !response.ok()) return
    total = ((await response.json()) as { totalAmount: number }).totalAmount
  })
  return () => money.format(total)
}

test.describe('the cart', () => {
  test('adds two products, changes a quantity, removes and undoes; the totals are the server’s', async ({
    page,
    request,
  }) => {
    const username = await createAccount(request)
    const serverTotal = lastTotal(page)
    // Read when polled, not when written: the answer may still be on its way.
    await page.goto('/sign-in')
    await signIn(page, username)
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()

    // Two different products from the shelf.
    await page.getByRole('button', { name: 'Add to cart' }).first().click()
    await expect(page.getByRole('button', { name: /^In your cart \(1\)$/ })).toHaveCount(1)
    await page.getByRole('button', { name: 'Add to cart' }).first().click()
    await expect(page.getByRole('button', { name: /^In your cart \(1\)$/ })).toHaveCount(2)
    await expect(page.getByRole('banner').getByRole('link', { name: 'Cart, 2 items' })).toBeVisible()

    await page.getByRole('banner').getByRole('link', { name: /^Cart/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
    const lines = page.getByRole('list', { name: 'Items in your cart' }).getByRole('listitem')
    await expect(lines).toHaveCount(2)
    await expect(page.getByText('price when added')).toHaveCount(2)
    const summary = page.getByRole('region', { name: 'Order summary' })
    await expect.poll(async () => (await summary.textContent())?.includes(serverTotal())).toBe(true)

    // A quantity change: the stepper moves, then the totals are the server's new ones.
    await lines.first().getByRole('button', { name: 'Increase' }).click()
    await expect(lines.first().getByRole('status')).toHaveText('2')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Cart, 3 items' })).toBeVisible()
    await expect.poll(async () => (await summary.textContent())?.includes(serverTotal())).toBe(true)

    // Remove, then undo.
    const firstName = (await lines.first().locator('.ed-cartline-name').textContent()) ?? ''
    await lines
      .first()
      .getByRole('button', { name: /^Remove / })
      .click()
    await expect(page.getByText(`${firstName} removed.`)).toBeVisible()
    await expect(lines).toHaveCount(1)
    await expect.poll(async () => (await summary.textContent())?.includes(serverTotal())).toBe(true)

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(lines).toHaveCount(2)
    await expect(lines.filter({ hasText: firstName })).toContainText('2')
    await expect.poll(async () => (await summary.textContent())?.includes(serverTotal())).toBe(true)
  })

  // Phase 24 replaced "a signed-out add goes to sign-in" with the guest cart (e2e/guest-cart.spec.ts has the whole flow).
  test('a signed-out visitor’s add stays on the page, and signing in moves it into the account’s cart', async ({
    page,
    request,
  }) => {
    const username = await createAccount(request)
    await page.goto('/')

    const card = page
      .getByRole('article')
      .filter({ has: page.getByRole('button', { name: 'Add to cart' }) })
      .first()
    const name = (await card.getByRole('heading', { level: 2 }).textContent()) ?? ''
    await card.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Cart, 1 item' })).toBeVisible()

    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
    await signIn(page, username)

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
    await expect(page.getByText('Your cart is up to date')).toBeVisible()
    await expect(
      page
        .getByRole('article')
        .filter({ has: page.getByRole('heading', { level: 2, name, exact: true }) })
        .getByRole('button', { name: 'In your cart (1)' }),
    ).toBeVisible()
  })
})
