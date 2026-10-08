import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { notFoundResponseError, stubProposedProduct, unavailableResponseError, visit } from './screens'

const password = 'correct horse battery'

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Ask the shop' })
const opener = (page: Page) => page.getByRole('button', { name: 'Ask the shop' })

async function ask(page: Page, text: string) {
  await sheet(page).getByRole('textbox', { name: 'Your message' }).fill(text)
  await sheet(page).getByRole('button', { name: 'Send' }).click()
}

/**
 * True when no element of the page behind the sheet has focus. A modal dialog makes everything outside it inert; at the end of
 * its controls Tab goes on to the browser's own interface, which leaves `document.body` as the active element.
 */
const focusIsNotBehindTheSheet = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement
    return active === document.body || active?.closest('dialog') != null
  })

const proposal = {
  conversationId: '2f1c7a36-5a5e-4c55-9d0e-0f1a8f0f3b9e',
  answer: 'The Mechanical Keyboard would suit you. I can add one to your cart.',
  sources: [{ type: 'PRODUCT', id: '1', title: 'Mechanical Keyboard' }],
  toolsUsed: ['searchProducts', 'addToCart'],
  pendingAction: {
    id: '0b6f0c1e-1a2b-4c3d-8e9f-000000000001',
    productId: 1,
    productName: 'Mechanical Keyboard',
    quantity: 1,
    unitPrice: 8999,
  },
}

test.describe('the assistant sheet, by keyboard', () => {
  test('opens, keeps focus inside while it is open, closes on Escape and gives focus back', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()

    await opener(page).focus()
    await page.keyboard.press('Enter')

    await expect(sheet(page)).toBeVisible()
    await expect(sheet(page).getByRole('link', { name: 'Sign in' })).toBeVisible()
    // The browser traps focus in a modal dialog: however many times Tab is pressed, it stays in the sheet.
    for (let press = 0; press < 8; press++) {
      await page.keyboard.press('Tab')
      expect(await focusIsNotBehindTheSheet(page)).toBe(true)
    }

    await page.keyboard.press('Escape')

    await expect(sheet(page)).toBeHidden()
    await expect(opener(page)).toBeFocused()
  })

  test('a signed-in customer lands in the message box, and Shift+Tab does not escape the sheet', async ({ page }) => {
    await visit(page, '/about', 'CUSTOMER')

    await opener(page).click()

    await expect(sheet(page).getByRole('textbox', { name: 'Your message' })).toBeFocused()
    for (let press = 0; press < 6; press++) {
      await page.keyboard.press('Shift+Tab')
      expect(await focusIsNotBehindTheSheet(page)).toBe(true)
    }
  })
})

test.describe('confirm before act (stubbed answers)', () => {
  test('nothing reaches the cart until Add it is pressed; then the cart count goes up', async ({ page }) => {
    await visit(page, '/about', 'CUSTOMER')
    const confirms: string[] = []
    await stubProposedProduct(page)
    await page.route('**/api/assistant/chat', (route) => route.fulfill({ json: proposal }))
    await page.route('**/api/assistant/actions/*/confirm', (route) => {
      confirms.push(route.request().url())
      return route.fulfill({ json: { productId: 1, productName: 'Mechanical Keyboard', quantity: 1, cartTotal: 9999 } })
    })
    // The signed-in stub's cart has three pieces. After the confirm it has one more: the app has to ask for the cart again to know.
    let confirmed = false
    await page.route('**/api/cart', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            json: {
              id: 1,
              totalAmount: 1000,
              items: [
                {
                  productId: 2,
                  productName: 'Wireless Mouse',
                  unitPrice: 250,
                  quantity: confirmed ? 4 : 3,
                  lineTotal: 1000,
                },
              ],
            },
          })
        : route.continue(),
    )
    await expect(page.getByRole('link', { name: 'Cart, 3 items' })).toBeVisible()

    await opener(page).click()
    await ask(page, 'Something to type on')

    await expect(sheet(page).getByText('Checked: Mechanical Keyboard')).toBeVisible()
    await expect(sheet(page).getByRole('button', { name: 'Add it' })).toBeVisible()
    expect(confirms).toEqual([])
    await expect(page.getByRole('link', { name: 'Cart, 3 items' })).toBeVisible()

    confirmed = true
    await sheet(page).getByRole('button', { name: 'Add it' }).click()

    await expect(sheet(page).getByText('Added 1 × Mechanical Keyboard to your cart.')).toBeVisible()
    expect(confirms).toHaveLength(1)
    await expect(page.getByRole('link', { name: 'Cart, 4 items' })).toBeVisible()
  })
})

test.describe('a suggestion that expired', () => {
  // The browser logs the stubbed 404 itself.
  test.use({ allowedConsoleErrors: [notFoundResponseError] })

  test('a suggestion that expired says so plainly', async ({ page }) => {
    await visit(page, '/about', 'CUSTOMER')
    await stubProposedProduct(page)
    await page.route('**/api/assistant/chat', (route) => route.fulfill({ json: proposal }))
    await page.route('**/api/assistant/actions/*/confirm', (route) =>
      route.fulfill({ status: 404, json: { status: 404, message: 'Unknown action' } }),
    )
    await opener(page).click()
    await ask(page, 'Something to type on')
    await sheet(page).getByRole('button', { name: 'Add it' }).click()

    await expect(sheet(page).getByText(/That suggestion has expired or was already added/)).toBeVisible()
  })
})

test.describe('without a model (503)', () => {
  test.use({ allowedConsoleErrors: [unavailableResponseError] })

  test('the sheet says it is not available and offers a search of the same words', async ({ page }) => {
    await visit(page, '/about', 'CUSTOMER')
    await page.route('**/api/assistant/chat', (route) =>
      route.fulfill({ status: 503, json: { status: 503, message: 'The assistant is not configured.' } }),
    )

    await opener(page).click()
    await ask(page, 'quiet keyboard')

    await expect(sheet(page).getByText("The assistant isn't available right now.")).toBeVisible()
    await sheet(page).getByRole('link', { name: 'Search the shop instead' }).click()

    await expect(page).toHaveURL(/\/search\?q=quiet%20keyboard$/)
    await expect(sheet(page)).toBeHidden()
  })
})

// The real backend and a real account: the answer depends on whether a model is configured and on what it has indexed, so
// this spec only holds to what is always true: the question is answered (or the 503 note appears), and the cart is not touched.
test.describe('against the real backend', () => {
  test.use({ allowedConsoleErrors: [unavailableResponseError] })

  async function createAccount(request: APIRequestContext) {
    const username = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const response = await request.post('/api/customers/register', {
      data: { username, password, fullName: 'E2E Person' },
    })
    expect(response.status()).toBe(201)
    return username
  }

  test('a question is answered, or the 503 note appears, and the cart stays as it was', async ({ page, request }) => {
    const username = await createAccount(request)
    await page.goto('/sign-in')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
    const writes: string[] = []
    page.on('request', (req) => {
      if (req.method() !== 'GET' && new URL(req.url()).pathname.startsWith('/api/cart')) writes.push(req.url())
    })

    await opener(page).click()
    await ask(page, 'Which of your products would suit a long flight?')

    const answer = sheet(page).getByText('Shop assistant')
    const unavailable = sheet(page).getByText("The assistant isn't available right now.")
    await expect(answer.or(unavailable)).toBeVisible({ timeout: 60_000 })
    expect(writes).toEqual([])
  })
})
