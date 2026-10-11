import type { APIRequestContext, Locator, Page } from '@playwright/test'
import type { components as AppApi } from '../src/api/generated/app'
import type { components as CatalogApi } from '../src/api/generated/catalog'
import type { components as CustomerApi } from '../src/api/generated/customer'
import { expect } from './fixtures'

// The specs that run against the real backend find their data in it, or arrange it, instead of naming the seed (web KI-020,
// KI-025). The suite runs on a fresh stack in CI and on a used one locally, where checkouts have drained the seeded stock and
// other products have been added: the shelf can be many pages long, so "the seeded Desk Mat, on the first page, in stock"
// does not hold there. Every pick below reads the live catalogue (every page) at the moment the test needs it.

export type Product = CatalogApi['schemas']['ProductResponse']

export const password = 'correct horse battery'

/** A new customer, through the API: every test that signs in has an account and a cart of its own. */
export async function createAccount(request: APIRequestContext) {
  const username = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const response = await request.post('/api/customers/register', {
    data: { username, password, fullName: 'E2E Person' },
  })
  expect(response.status()).toBe(201)
  return username
}

/** The whole live catalogue: the pinned backend pages `GET /api/products` (web KI-030), so every page is read. */
export async function allProducts(request: APIRequestContext): Promise<Product[]> {
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

/**
 * The admin spec (registered only with the admin credentials, decision [Phase 17]) changes the catalogue while the suite runs:
 * its own "E2E product …" and "E2E import …" rows come and go, and it sets Mechanical Keyboard's stock to the level it read.
 * The catalogue checks leave its rows out, and no pick below uses either.
 */
export const madeByTheAdminSpec = (product: Pick<Product, 'name'>) => product.name.startsWith('E2E ')
const changedByTheAdminSpec = (product: Pick<Product, 'name'>) =>
  madeByTheAdminSpec(product) || product.name === 'Mechanical Keyboard'

/** The simulated payment declines an order whose total is above this (integration guide: "Payment declined"). */
const paymentLimit = 10_000

/**
 * The product the confirmed purchases buy (one each: checkout.spec.ts and keyboard-flows.spec.ts, at the same time): priced
 * within the payment limit, and the most in stock (at least two), so the stock they take for good is the least missed.
 */
function pickToBuy(products: readonly Product[]): Product | undefined {
  return products
    .filter((product) => !changedByTheAdminSpec(product))
    .filter((product) => product.stockQuantity >= 2 && product.price <= paymentLimit)
    .sort((a, b) => b.stockQuantity - a.stockQuantity || a.id - b.id)[0]
}

/**
 * How many of a product make an order the payment declines: the fewest whose total passes the limit, and at least two, so
 * "add these items again" is seen to bring the quantity back (one would look the same as a fresh add). The test only chooses a
 * quantity: the totals it then checks are the server's.
 */
const quantityOverTheLimit = (price: number) => Math.max(2, Math.floor(paymentLimit / price) + 1)

/** At most this many clicks on Add to cart for one order. */
const mostToAdd = 5

/**
 * The order the saga cancels (checkout.spec.ts once, orders.spec.ts twice, at the same time): a product and a quantity whose
 * total passes the payment limit, taken from the product with the most such orders in stock, since each order holds its
 * quantity until the saga cancels it and a placement beyond the free stock is refused up front instead.
 */
function pickOverTheLimit(products: readonly Product[]): { product: Product; quantity: number } | undefined {
  const ordersInStock = ({ product, quantity }: { product: Product; quantity: number }) =>
    Math.floor(product.stockQuantity / quantity)
  return products
    .filter((product) => !changedByTheAdminSpec(product) && product.price > 0)
    .map((product) => ({ product, quantity: quantityOverTheLimit(product.price) }))
    .filter((order) => order.quantity <= mostToAdd && ordersInStock(order) >= 1)
    .sort((a, b) => ordersInStock(b) - ordersInStock(a) || a.product.id - b.product.id)[0]
}

/** An in-stock product that one confirmed order can buy. */
export async function productToBuy(request: APIRequestContext): Promise<Product> {
  const product = pickToBuy(await allProducts(request))
  expect(product, 'the backend needs a product priced at most 10 000 with at least 2 in stock').toBeDefined()
  return product!
}

/** A product, and how many of it, for an order the payment declines. */
export async function orderOverTheLimit(request: APIRequestContext): Promise<{ product: Product; quantity: number }> {
  const order = pickOverTheLimit(await allProducts(request))
  expect(
    order,
    `the backend needs a product of which at most ${mostToAdd} in stock come to more than 10 000`,
  ).toBeDefined()
  return order!
}

/**
 * The in-stock product with the fewest left, as the live backend has it now (web KI-020): a test that needs "a few in stock"
 * finds it instead of assuming a seeded product still has its seeded level. Below 99, so the cart's stepper (max 99) can go one
 * above it. It is never the product the other specs buy or hold at the same time (the picks above, on the same catalogue), so
 * its level does not change while the test reads it.
 */
export async function productWithFewestInStock(request: APIRequestContext): Promise<Product> {
  const products = await allProducts(request)
  const takenElsewhere = new Set([pickToBuy(products)?.id, pickOverTheLimit(products)?.product.id])
  const candidates = products
    .filter((product) => product.stockQuantity >= 1 && product.stockQuantity < 99)
    .filter((product) => !changedByTheAdminSpec(product) && !takenElsewhere.has(product.id))
    .sort((a, b) => a.stockQuantity - b.stockQuantity || a.id - b.id)
  expect(candidates.length, 'the backend needs a product with 1 to 98 in stock').toBeGreaterThan(0)
  return candidates[0]!
}

/** Puts a line in the person's server-side cart through the API (adding does not check stock), before the browser signs in. */
export async function putInCart(request: APIRequestContext, username: string, productId: number, quantity: number) {
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

/** The shelf's "Showing 1–24 of 145 products": shown with the cards of a page, so it says the page has rendered. */
export const shelfCount = (page: Page) => page.getByText(/^Showing \d+–\d+ of \d+ products$/)

/** A product's card, found by its link (`/products/{id}`), so two products with the same name cannot be confused. */
export const productCard = (page: Page, product: Pick<Product, 'id'>): Locator =>
  page.getByRole('article').filter({ has: page.locator(`a[href="/products/${product.id}"]`) })

/**
 * Follows the shelf's "Next page" link from the page it shows now, until `product`'s card is on it, and returns the card. The
 * shelf sorts the whole catalogue A to Z, 24 a page, so a product need not be on the first one (web KI-025). `follow` uses the
 * link: a click by default, the keyboard in keyboard-flows.spec.ts.
 */
export async function findOnShelf(
  page: Page,
  product: Pick<Product, 'id' | 'name'>,
  follow: (link: Locator) => Promise<void> = (link) => link.click(),
): Promise<Locator> {
  const card = productCard(page, product)
  for (;;) {
    await expect(shelfCount(page)).toBeVisible()
    if ((await card.count()) > 0) return card
    const next = page.getByRole('link', { name: 'Next page' })
    await expect(next, `${product.name} (id ${product.id}) is on no page of the shelf`).toHaveCount(1)
    await turnThePage(page, () => follow(next))
  }
}

/** Uses the "Next page" link and waits until the next page has rendered (its "Showing …" line changes). */
async function turnThePage(page: Page, follow: () => Promise<void>) {
  const shown = (await shelfCount(page).textContent()) ?? ''
  await follow()
  await expect(shelfCount(page)).not.toHaveText(shown)
}

export type ShelfCard = { id: number; name: string; price: string }

/**
 * Every card on the shelf, page after page from the one it shows: the product's id (from its link), its name and its price as
 * displayed. Each page is read once it has rendered, with nothing still loading.
 */
export async function everyShelfCard(page: Page): Promise<ShelfCard[]> {
  const cards: ShelfCard[] = []
  for (;;) {
    await expect(shelfCount(page)).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
    const onThisPage = await page
      .getByRole('listitem')
      .getByRole('article')
      .evaluateAll((articles) =>
        articles.map((article) => ({
          href: article.querySelector('h2 a')?.getAttribute('href') ?? '',
          name: article.querySelector('h2')?.textContent ?? '',
          price: article.querySelector('.ed-price-now')?.textContent ?? '',
        })),
      )
    expect(onThisPage.length, 'a shelf page shows at least one card').toBeGreaterThan(0)
    cards.push(
      ...onThisPage.map(({ href, name, price }) => ({
        id: Number(/^\/products\/(\d+)$/.exec(href)?.[1]),
        name,
        price,
      })),
    )
    const next = page.getByRole('link', { name: 'Next page' })
    if ((await next.count()) === 0) return cards
    await turnThePage(page, () => next.click())
  }
}

/**
 * Products a visitor can put in a guest cart (Phase 24): in stock (at least 3, so the shelf offers Add to cart while other
 * specs buy at the same time), not the admin spec's, and not the products the purchases above take, in id order. Nothing is
 * ordered with them, so no stock is taken.
 */
export async function productsToBrowse(request: APIRequestContext, count: number): Promise<Product[]> {
  const products = await allProducts(request)
  const takenElsewhere = new Set([pickToBuy(products)?.id, pickOverTheLimit(products)?.product.id])
  const candidates = products
    .filter(
      (product) => product.stockQuantity >= 3 && !changedByTheAdminSpec(product) && !takenElsewhere.has(product.id),
    )
    .sort((a, b) => a.id - b.id)
  expect(candidates.length, `the backend needs ${count} products with at least 3 in stock`).toBeGreaterThanOrEqual(
    count,
  )
  return candidates.slice(0, count)
}

/** The person's server-side cart through the API, as product id to quantity: what the guest cart's replay must have left there. */
export async function cartOf(request: APIRequestContext, username: string): Promise<Record<number, number>> {
  const login = await request.post('/api/auth/login', {
    data: { username, password } satisfies CustomerApi['schemas']['LoginRequest'],
  })
  expect(login.status()).toBe(200)
  const { accessToken } = (await login.json()) as CustomerApi['schemas']['TokenResponse']
  const response = await request.get('/api/cart', { headers: { Authorization: `Bearer ${accessToken}` } })
  expect(response.status()).toBe(200)
  const cart = (await response.json()) as AppApi['schemas']['CartResponse']
  return Object.fromEntries(cart.items.map((item) => [item.productId, item.quantity]))
}
