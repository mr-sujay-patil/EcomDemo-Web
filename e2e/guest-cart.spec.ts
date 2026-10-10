import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { cartOf, createAccount, findOnShelf, password, productsToBrowse, putInCart, type Product } from './live-data'

// Phase 24: a visitor fills a cart kept in the browser; signing in moves it into the account's cart (POST /api/cart/items, one
// line at a time). Real accounts and the real cart API. Signed out, a page load costs nothing (there is no session to lose,
// and the guest cart is in localStorage), so these specs reload on purpose; after signing in every move is a click.
const GUEST_CART_KEY = 'ecomdemo-guest-cart-v1'
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/** Adds `product` from the shelf (whichever page holds it) `times` times, as a visitor. */
async function addFromShelf(page: Page, product: Product, times = 1) {
  await page.goto('/')
  const card = await findOnShelf(page, product)
  for (let n = 1; n <= times; n += 1) {
    await card.getByRole('button', { name: n === 1 ? 'Add to cart' : `In your cart (${n - 1})` }).click()
    await expect(card.getByRole('button', { name: `In your cart (${n})` })).toBeVisible()
  }
}

const storedGuestCart = (page: Page) => page.evaluate((key) => localStorage.getItem(key), GUEST_CART_KEY)

async function signIn(page: Page, username: string) {
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('the guest cart', () => {
  test('a visitor adds, reloads, sees current prices, signs in to check out, and the lines are in the account’s cart', async ({
    page,
    request,
  }) => {
    const username = await createAccount(request)
    const [first, second] = (await productsToBrowse(request, 2)) as [Product, Product]

    await addFromShelf(page, first)
    await addFromShelf(page, second, 2)
    const header = page.getByRole('banner')
    await expect(header.getByRole('link', { name: 'Cart, 3 items' })).toBeVisible()

    // A reload keeps it: the browser holds ids and quantities, nothing else.
    await page.reload()
    await expect(header.getByRole('link', { name: 'Cart, 3 items' })).toBeVisible()
    expect(JSON.parse((await storedGuestCart(page)) ?? '')).toEqual({
      items: [
        { productId: first.id, quantity: 1 },
        { productId: second.id, quantity: 2 },
      ],
    })

    await header.getByRole('link', { name: 'Cart, 3 items' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
    const lines = page.getByRole('list', { name: 'Items in your cart' }).getByRole('listitem')
    await expect(lines).toHaveCount(2)
    // The server's current price for each, and no total worked out in the browser.
    await expect(lines.nth(0)).toContainText(`${money.format(first.price)} each`)
    await expect(lines.nth(1)).toContainText(`${money.format(second.price)} each`)
    await expect(page.getByText('current price')).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Order summary' })).toHaveCount(0)

    await page.getByRole('link', { name: 'Sign in to check out' }).click()
    await expect(page).toHaveURL('/sign-in?next=%2Fcart')
    await signIn(page, username)

    await expect(page).toHaveURL('/cart')
    await expect(page.getByText('Your cart is up to date')).toBeVisible()
    await expect(lines).toHaveCount(2)
    await expect(page.getByText('price when added')).toHaveCount(2)
    await expect(header.getByRole('link', { name: 'Cart, 3 items' })).toBeVisible()
    expect(await cartOf(request, username)).toEqual({ [first.id]: 1, [second.id]: 2 })
    expect(await storedGuestCart(page)).toBeNull()
  })

  test('merging into an account that already has the product adds the quantities', async ({ page, request }) => {
    const username = await createAccount(request)
    const [product] = (await productsToBrowse(request, 1)) as [Product]
    await putInCart(request, username, product.id, 2)

    await addFromShelf(page, product)
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
    await signIn(page, username)

    await expect(page.getByText('The 1 item you chose before signing in is in your cart now.')).toBeVisible()
    expect(await cartOf(request, username)).toEqual({ [product.id]: 3 })
    expect(await storedGuestCart(page)).toBeNull()
  })
})
