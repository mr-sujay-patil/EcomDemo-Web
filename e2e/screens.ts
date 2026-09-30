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
}

/** Aborting a request makes Chrome log this console error itself; the app logs nothing. */
export const abortedRequestError = /Failed to load resource: net::ERR_FAILED/

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
]

export const widths = [360, 480, 768, 1024, 1280] as const
export const colorSchemes = ['light', 'dark'] as const
