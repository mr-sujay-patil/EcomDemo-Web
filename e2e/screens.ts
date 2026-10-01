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
}

/** Every route of src/app/router.tsx, as a user would reach it: the path, the h1 and the document title. */
export const routePages = [
  // Seeded by the backend's migration (catalog-service V2__seed_products.sql), as in e2e/catalog.spec.ts.
  { name: 'product-detail', path: '/products/1', h1: 'Mechanical Keyboard', title: 'Product', report: true },
  { name: 'search', path: '/search', h1: 'Search', title: 'Search', report: false },
  { name: 'cart', path: '/cart', h1: 'Your cart', title: 'Your cart', report: true },
  { name: 'checkout', path: '/checkout', h1: 'Checkout', title: 'Checkout', report: false },
  { name: 'orders', path: '/orders', h1: 'Your orders', title: 'Your orders', report: false },
  { name: 'order-detail', path: '/orders/42', h1: 'Order', title: 'Order', report: false },
  { name: 'account', path: '/account', h1: 'Your account', title: 'Your account', report: false },
  { name: 'sign-in', path: '/sign-in', h1: 'Sign in', title: 'Sign in', report: false },
  { name: 'register', path: '/register', h1: 'Create an account', title: 'Create an account', report: false },
  { name: 'admin', path: '/admin', h1: 'Admin', title: 'Admin', report: false },
  { name: 'about', path: '/about', h1: 'About', title: 'About', report: true },
  { name: 'returns', path: '/returns', h1: 'Returns', title: 'Returns', report: false },
  { name: 'shipping', path: '/shipping', h1: 'Shipping', title: 'Shipping', report: false },
  { name: 'privacy', path: '/privacy', h1: 'Privacy', title: 'Privacy', report: false },
  { name: 'terms', path: '/terms', h1: 'Terms', title: 'Terms', report: false },
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
  ...routePages.map(({ name, path, h1, report }): Screen => ({
    name,
    path,
    report,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
    },
  })),
]

export const widths = [360, 480, 768, 1024, 1280] as const
export const colorSchemes = ['light', 'dark'] as const
