import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { activate, typeInto, watchPointer } from './keyboard'
import { createAccount, findOnShelf, password, productToBuy } from './live-data'
import { visit } from './screens'

// The main flows again, with no mouse: every control is reached with Tab and used with Enter or Space, and the test
// fails if a pointer event ever reaches the page (watchPointer). Real accounts, the real cart and the real order saga,
// as in checkout.spec.ts: the purchase is one of the product with the most in stock, from the live catalogue (web KI-025).

async function signInByKeyboard(page: Page, username: string) {
  await typeInto(page, page.getByLabel('Username'), username)
  await typeInto(page, page.getByLabel('Password', { exact: true }), password)
  await activate(page, page.getByRole('button', { name: 'Sign in' }))
  await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
}

test.describe('by keyboard alone', () => {
  test('a customer signs in, buys, finds the order and signs out', async ({ page, request }) => {
    const product = await productToBuy(request)
    const username = await createAccount(request)
    const pointer = await watchPointer(page)
    await page.goto('/sign-in')

    await signInByKeyboard(page, username)

    // Its card may be pages into the shelf: the "Next page" link is followed by keyboard too.
    const card = await findOnShelf(page, product, (next) => activate(page, next))
    await activate(page, card.getByRole('button', { name: 'Add to cart' }))
    await expect(card.getByRole('button', { name: 'In your cart (1)' })).toBeVisible()

    await activate(page, page.getByRole('banner').getByRole('link', { name: /^Cart/ }))
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
    // The stepper: Space on Increase and Decrease, ending where it started.
    const line = page.getByRole('list', { name: 'Items in your cart' }).getByRole('listitem').first()
    await activate(page, line.getByRole('button', { name: 'Increase' }), 'Space')
    await expect(line.getByRole('status')).toHaveText('2')
    await activate(page, line.getByRole('button', { name: 'Decrease' }), 'Space')
    await expect(line.getByRole('status')).toHaveText('1')

    await activate(page, page.getByRole('button', { name: 'Place order' }))
    await expect(page).toHaveURL(/\/orders\/\d+$/)
    await expect(page.getByText('Your order is confirmed.')).toBeVisible({ timeout: 30_000 })

    // The account menu opens with Enter, and its links are in the tab order.
    await activate(page, page.getByRole('button', { name: 'Account: E2E' }))
    await activate(page, page.getByRole('link', { name: 'My orders' }))
    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible()

    await activate(page, page.getByRole('button', { name: 'Account: E2E' }))
    await activate(page, page.getByRole('button', { name: 'Sign out' }))
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible()

    pointer.expectUnused()
  })

  test('a signed-out visitor opens a product, is sent to sign in, and comes back to it', async ({ page, request }) => {
    const username = await createAccount(request)
    const pointer = await watchPointer(page)
    await page.goto('/')

    // Whichever product the shelf shows first: the flow is about the way there and back, not about one product.
    const card = page.getByRole('article').first()
    const name = (await card.getByRole('heading', { level: 2 }).textContent()) ?? ''
    expect(name).not.toBe('')
    await activate(page, card.getByRole('link', { name, exact: true }))
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
    const productPath = new URL(page.url()).pathname

    await activate(page, page.getByRole('main').getByRole('button', { name: 'Add to cart' }))
    await expect(page).toHaveURL(/\/sign-in\?next=/)
    await signInByKeyboard(page, username)

    await expect(page).toHaveURL(productPath)
    pointer.expectUnused()
  })

  test('a visitor registers', async ({ page }) => {
    const pointer = await watchPointer(page)
    await page.goto('/register')
    const username = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    await typeInto(page, page.getByLabel('Full name'), 'E2E Person')
    await typeInto(page, page.getByLabel('Username'), username)
    await typeInto(page, page.getByLabel('Password', { exact: true }), password)
    await activate(page, page.getByRole('button', { name: 'Create account' }))

    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    pointer.expectUnused()
  })

  test('a search is typed and sent with Enter', async ({ page }) => {
    const pointer = await watchPointer(page)
    await page.goto('/')

    await typeInto(page, page.getByRole('banner').getByRole('combobox', { name: 'Search products' }), 'desk')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/search\?q=desk/)
    await expect(page.getByRole('heading', { level: 1, name: 'Results for “desk”' })).toBeVisible()
    pointer.expectUnused()
  })
})

test.describe('dialogs, by keyboard', () => {
  test('the admin delete dialog opens, keeps focus inside, closes on Escape and gives focus back', async ({ page }) => {
    await visit(page, '/admin/products', 'ADMIN')
    const opener = page.getByRole('button', { name: 'Delete USB-C Hub' })
    await expect(opener).toBeVisible()

    await activate(page, opener)

    const dialog = page.locator('dialog.admin-dialog')
    await expect(dialog).toBeVisible()
    // The page behind is inert: Tab only ever lands in the dialog (or leaves the page for the browser).
    for (let press = 0; press < 8; press++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => {
        const active = document.activeElement
        return active === document.body || active?.closest('dialog') != null
      })
      expect(inside, 'focus stays inside the dialog').toBe(true)
    }

    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })
})
