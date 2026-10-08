import type { Page } from '@playwright/test'
import { expect } from './fixtures'

export type Screen = {
  /** File-name friendly; used in test titles and screenshot names. */
  name: string
  path: string
  /** Runs before navigation, for example to make the backend fail with `page.route`. */
  prepare?: (page: Page) => Promise<void>
  /** Resolves once the screen shows its final content, so nothing is measured half-loaded. */
  ready: (page: Page) => Promise<void>
  /** Console errors this screen causes on purpose (see `allowedConsoleErrors`). */
  allowedConsoleErrors?: RegExp[]
  /** False for screens that look like another one (the placeholders): the report skips their screenshots. */
  report?: boolean
  /** Reached signed in as this role: the helper signs in (with stubbed answers) and arrives here without a reload. */
  signedInAs?: Role
}

export type Role = 'CUSTOMER' | 'ADMIN'

/**
 * Makes the backend accept any sign-in as `role`, with a token that lasts 15 minutes. For specs about layout and
 * screens, where who is signed in matters and the backend's own sign-in does not. The specs about signing in itself
 * (auth.spec.ts, accounts.spec.ts) use real accounts.
 */
export async function stubAccount(page: Page, role: Role) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      json: {
        accessToken: 'e2e-stub-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      },
    }),
  )
  // A signed-in customer's header asks for the cart on every page; the stubbed token would be refused by the real one.
  // Two lines, one with a long name, so the layout specs measure a cart that could clip.
  await page.route('**/api/cart', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          json: {
            id: 1,
            totalAmount: 1000.5,
            items: [
              { productId: 1, productName: 'Mechanical Keyboard', unitPrice: 250.25, quantity: 2, lineTotal: 500.5 },
              {
                productId: 2,
                productName: 'Ultra-wide curved monitor with an unreasonably long product name to test wrapping',
                unitPrice: 500,
                quantity: 1,
                lineTotal: 500,
              },
            ],
          },
        })
      : route.continue(),
  )
  // My orders: the cancelled order with the long reason first, then a confirmed and a pending one, so the table is measured at its widest.
  await page.route('**/api/orders', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          json: [
            {
              id: 42,
              placedAt: '2026-10-06T10:00:00Z',
              username: 'e2e.person',
              status: 'CANCELLED',
              statusReason: 'Payment declined: 12000.00 exceeds the limit of 10000.00',
              statusChangedAt: '2026-10-06T10:00:05Z',
              totalAmount: 12000,
              items: [
                {
                  productId: 3,
                  productName: 'Ultra-wide curved monitor',
                  unitPrice: 12000,
                  quantity: 1,
                  lineTotal: 12000,
                },
              ],
            },
            {
              id: 41,
              placedAt: '2026-10-05T09:30:00Z',
              username: 'e2e.person',
              status: 'CONFIRMED',
              statusReason: '',
              statusChangedAt: '2026-10-05T09:30:04Z',
              totalAmount: 1234567.5,
              items: [
                { productId: 1, productName: 'Mechanical Keyboard', unitPrice: 250.25, quantity: 12, lineTotal: 3003 },
              ],
            },
            {
              id: 40,
              placedAt: '2026-10-04T08:00:00Z',
              username: 'e2e.person',
              status: 'PENDING',
              statusReason: '',
              statusChangedAt: '2026-10-04T08:00:00Z',
              totalAmount: 500,
              items: [{ productId: 2, productName: 'USB-C Hub', unitPrice: 500, quantity: 1, lineTotal: 500 }],
            },
          ],
        })
      : route.continue(),
  )
  // Order 42: cancelled, with a long reason and a long product name, so the layout specs measure the busiest order page.
  await page.route('**/api/orders/42', (route) =>
    route.fulfill({
      json: {
        id: 42,
        placedAt: '2026-10-06T10:00:00Z',
        username: 'e2e.person',
        status: 'CANCELLED',
        statusReason: 'Payment declined: 12000.00 exceeds the limit of 10000.00',
        statusChangedAt: '2026-10-06T10:00:05Z',
        totalAmount: 12000,
        items: [
          {
            productId: 3,
            productName: 'Ultra-wide curved monitor with an unreasonably long product name to test wrapping',
            unitPrice: 12000,
            quantity: 1,
            lineTotal: 12000,
          },
        ],
      },
    }),
  )
  await page.route('**/api/orders/42/status', (route) =>
    route.fulfill({
      json: {
        orderId: 42,
        status: 'CANCELLED',
        reason: 'Payment declined: 12000.00 exceeds the limit of 10000.00',
        changedAt: '2026-10-06T10:00:05Z',
      },
    }),
  )
  await page.route('**/api/customers/me', (route) =>
    route.fulfill({
      json: { id: 1, username: 'e2e.person', fullName: 'E2E Person', role, createdAt: '2026-10-06T10:00:00Z' },
    }),
  )
}

/**
 * Opens `path` as a person who may see it. A session lives in memory, so a plain `page.goto` of a guarded page
 * would bounce to sign-in: this goes to the sign-in page with `?next=`, signs in, and arrives at `path` the way a
 * person would, with no reload in between.
 */
export async function visit(page: Page, path: string, signedInAs?: Role) {
  if (!signedInAs) {
    await page.goto(path)
    return
  }
  await stubAccount(page, signedInAs)
  await page.goto(`/sign-in?next=${encodeURIComponent(path)}`)
  await page.getByLabel('Username').fill('e2e.person')
  await page.getByLabel('Password', { exact: true }).fill('not checked: the answer is stubbed')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Prepares, opens and waits for a screen: the one way the matrix and the report reach it. */
export async function openScreen(page: Page, screen: Screen) {
  await screen.prepare?.(page)
  await visit(page, screen.path, screen.signedInAs)
  await screen.ready(page)
}

/** Who must be signed in to see a route (src/app/router.tsx): the shop's private pages, and the console. */
export const signedInFor: Record<string, Role> = {
  '/cart': 'CUSTOMER',
  '/orders': 'CUSTOMER',
  '/orders/42': 'CUSTOMER',
  '/account': 'CUSTOMER',
  '/admin': 'ADMIN',
}

/** Every route of src/app/router.tsx, as a user would reach it: the path, the h1 and the document title. */
export const routePages = [
  // Seeded by the backend's migration (catalog-service V2__seed_products.sql), as in e2e/catalog.spec.ts.
  { name: 'product-detail', path: '/products/1', h1: 'Mechanical Keyboard', title: 'Product', report: true },
  { name: 'search', path: '/search', h1: 'Search', title: 'Search', report: false },
  { name: 'cart', path: '/cart', h1: 'Your cart', title: 'Your cart', report: true },
  { name: 'orders', path: '/orders', h1: 'Your orders', title: 'Your orders', report: true },
  { name: 'order-detail', path: '/orders/42', h1: 'Order #42', title: 'Order #42', report: true },
  { name: 'account', path: '/account', h1: 'Your account', title: 'Your account', report: true },
  { name: 'sign-in', path: '/sign-in', h1: 'Sign in', title: 'Sign in', report: true },
  { name: 'register', path: '/register', h1: 'Create an account', title: 'Create an account', report: true },
  { name: 'admin', path: '/admin', h1: 'Admin', title: 'Admin', report: false },
  { name: 'about', path: '/about', h1: 'About', title: 'About', report: true },
  { name: 'returns', path: '/returns', h1: 'Returns', title: 'Returns', report: false },
  { name: 'shipping', path: '/shipping', h1: 'Shipping', title: 'Shipping', report: false },
  { name: 'privacy', path: '/privacy', h1: 'Privacy', title: 'Privacy', report: false },
  { name: 'terms', path: '/terms', h1: 'Terms', title: 'Terms', report: false },
  // Only in the build the E2E suite previews (VITE_STYLEGUIDE=true, see playwright.config.ts); the production build has no such route.
  { name: 'styleguide', path: '/styleguide', h1: 'Style guide', title: 'Style guide', report: true },
  { name: 'not-found', path: '/no/such/page', h1: 'Page not found', title: 'Page not found', report: true },
] as const

/** Aborting a request makes Chrome log this console error itself; the app logs nothing. */
export const abortedRequestError = /Failed to load resource: net::ERR_FAILED/

/** The browser logs a 404 response itself, even though the app handles it. */
export const notFoundResponseError = /Failed to load resource: the server responded with a status of 404/

/** Makes every product request fail as if the gateway were unreachable. */
export async function gatewayUnreachable(page: Page) {
  await page.route('**/api/products', (route) => route.abort('failed'))
}

/**
 * Every screen of the app, in each state worth checking. The width-and-theme matrix and the
 * @report screenshots run over this list: a phase that adds a screen adds it here.
 */
export const screens: Screen[] = [
  {
    name: 'product-list',
    path: '/',
    ready: async (page) => {
      await expect(page.getByRole('listitem').first()).toBeVisible()
    },
  },
  {
    name: 'product-list-error',
    path: '/',
    prepare: gatewayUnreachable,
    ready: async (page) => {
      await expect(page.getByRole('alert')).toBeVisible()
    },
    allowedConsoleErrors: [abortedRequestError],
  },
  {
    name: 'product-not-found',
    path: '/products/999999999',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'No longer available' })).toBeVisible()
    },
    allowedConsoleErrors: [notFoundResponseError],
  },
  {
    // The form with every error showing: the longest the page ever gets.
    name: 'register-errors',
    path: '/register',
    ready: async (page) => {
      await page.getByRole('button', { name: 'Create account' }).click()
      await expect(page.getByText('Choose a username.')).toBeVisible()
      await expect(page.getByText('Enter your name.')).toBeVisible()
    },
  },
  {
    // A 401 is stubbed: one real wrong password costs a slot of the backend's login throttle (see accounts.spec.ts).
    name: 'sign-in-error',
    path: '/sign-in',
    prepare: async (page) => {
      await page.route('**/api/auth/login', (route) =>
        route.fulfill({ status: 401, json: { status: 401, message: 'Bad credentials' } }),
      )
    },
    ready: async (page) => {
      await page.getByLabel('Username').fill('someone')
      await page.getByLabel('Password', { exact: true }).fill('not the password')
      await page.getByRole('button', { name: 'Sign in' }).click()
      await expect(page.getByRole('alert')).toContainText('Wrong username or password.')
    },
    allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 401/],
  },
  {
    // The header's menu, open: the signed-in header at its widest use.
    name: 'account-menu',
    path: '/about',
    signedInAs: 'CUSTOMER',
    ready: async (page) => {
      await page.getByRole('button', { name: 'Account: E2E' }).click()
      await expect(page.getByRole('link', { name: 'My orders' })).toBeVisible()
    },
  },
  {
    // A customer on the console: the 403 in words.
    name: 'not-permitted',
    path: '/admin',
    signedInAs: 'CUSTOMER',
    report: true,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'Not permitted' })).toBeVisible()
    },
  },
  {
    // A throttled login is stubbed: a real one costs slots of the backend's login throttle (see accounts.spec.ts).
    name: 'sign-in-throttled',
    path: '/sign-in',
    prepare: async (page) => {
      await page.route('**/api/auth/login', (route) =>
        route.fulfill({
          status: 429,
          headers: { 'Retry-After': '30' },
          json: { status: 429, message: 'Too many failed sign-ins.' },
        }),
      )
    },
    ready: async (page) => {
      await page.getByLabel('Username').fill('someone')
      await page.getByLabel('Password', { exact: true }).fill('not the password')
      await page.getByRole('button', { name: 'Sign in' }).click()
      await expect(page.getByRole('button', { name: /^Try again in \d+ s$/ })).toBeDisabled()
    },
    allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 429/],
  },
  ...routePages.map(({ name, path, h1, report }): Screen => ({
    name,
    path,
    report,
    signedInAs: signedInFor[path],
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
    },
  })),
]

export const widths = [360, 480, 768, 1024, 1280] as const
export const colorSchemes = ['light', 'dark'] as const
