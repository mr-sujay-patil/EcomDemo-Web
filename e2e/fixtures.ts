import { test as base, expect } from '@playwright/test'

type Options = {
  /** Console errors a test expects and accepts, such as the browser's own "Failed to load resource" when it aborts a request on purpose. */
  allowedConsoleErrors: RegExp[]
  /**
   * Fetch product images from the real backend. Off by default: a shelf makes about ten requests, and a dozen
   * parallel workers then pass the gateway's rate limit (50 requests a second per client, so a 429). Only the
   * specs that are about images (design.spec.ts) turn it on.
   */
  realImages: boolean
}

// A small grey rectangle in the 4:3 shape of a product photo. A test double: it is never shown to a user.
const stubImage =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="gray"/></svg>'

// A React warning in the console is a bug waiting to happen, even when the page looks right.
const reactWarning = /\bReact\b|^Warning: /

/**
 * Every spec imports `test` and `expect` from here, never from '@playwright/test', so the console
 * guard runs in every test: a console.error, a React warning or an uncaught exception fails it.
 */
export const test = base.extend<Options & { consoleGuard: void; imageStub: void }>({
  allowedConsoleErrors: [[], { option: true }],
  realImages: [false, { option: true }],
  imageStub: [
    async ({ page, realImages }, use) => {
      if (!realImages) {
        await page.route('**/api/products/*/image', (route) =>
          route.fulfill({ status: 200, contentType: 'image/svg+xml', body: stubImage }),
        )
      }
      await use()
    },
    { auto: true },
  ],
  consoleGuard: [
    async ({ page, allowedConsoleErrors }, use) => {
      const problems: string[] = []
      page.on('console', (message) => {
        const text = message.text()
        const isError = message.type() === 'error' && !allowedConsoleErrors.some((allowed) => allowed.test(text))
        const isReactWarning = message.type() === 'warning' && reactWarning.test(text)
        if (isError || isReactWarning) problems.push(`console.${message.type()}: ${text}`)
      })
      page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`))

      await use()

      expect(problems, 'the browser console must stay clean').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
