import { test as base, expect } from '@playwright/test'

type Options = {
  /** Console errors a test expects and accepts, such as the browser's own "Failed to load resource" when it aborts a request on purpose. */
  allowedConsoleErrors: RegExp[]
}

// A React warning in the console is a bug waiting to happen, even when the page looks right.
const reactWarning = /\bReact\b|^Warning: /

/**
 * Every spec imports `test` and `expect` from here, never from '@playwright/test', so the console
 * guard runs in every test: a console.error, a React warning or an uncaught exception fails it.
 */
export const test = base.extend<Options & { consoleGuard: void }>({
  allowedConsoleErrors: [[], { option: true }],
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
