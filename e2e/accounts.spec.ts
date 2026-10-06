import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'

// These specs create real accounts in the backend, one or two per run, with names no one else will pick.
// Registration is not throttled; a wrong sign-in is (20 failed logins per 15 minutes per client address
// across everything on this machine, docs/backend/phase-33-delta.md), so exactly one spec fails a login,
// each with its own username.
const password = 'correct horse battery'
/** The browser logs a 4xx response itself, even though the app handles it: a spec that causes one on purpose says which. */
const logged = (status: number) => ({
  allowedConsoleErrors: [new RegExp(`Failed to load resource: the server responded with a status of ${status}`)],
})
const newUsername = () => `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Creates an account through the API, for specs that are about something after registration. */
async function createAccount(request: APIRequestContext, username: string) {
  const response = await request.post('/api/customers/register', {
    data: { username, password, fullName: 'E2E Person' },
  })
  expect(response.status()).toBe(201)
}

async function fillRegistration(page: Page, username: string, values: { password?: string; fullName?: string } = {}) {
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(values.password ?? password)
  await page.getByLabel('Full name').fill(values.fullName ?? 'E2E Person')
}

test.describe('register', () => {
  test('a new customer registers, lands on sign-in with the name filled in, and signs in', async ({ page }) => {
    const username = newUsername()
    await page.goto('/register')
    await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible()

    await fillRegistration(page, username)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL('/sign-in')
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Your account is ready.')
    await expect(page.getByLabel('Username')).toHaveValue(username)
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused()

    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('status')).toContainText('Signed in. Sessions arrive in the next phase.')
  })

  test.describe('with a 409 the browser logs', () => {
    test.use(logged(409))

    test('a username that is taken is refused on the username field', async ({ page, request }) => {
      const username = newUsername()
      await createAccount(request, username)
      await page.goto('/register')

      await fillRegistration(page, username)
      await page.getByRole('button', { name: 'Create account' }).click()

      await expect(page.getByLabel('Username')).toHaveAccessibleDescription(/taken|already|exists/i)
      await expect(page.getByLabel('Username')).toBeFocused()
      await expect(page).toHaveURL('/register')
    })
  })

  test('a too-short password is stopped in the browser, on its field, and nothing is sent', async ({ page }) => {
    const sent: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST') sent.push(request.url())
    })
    await page.goto('/register')

    await fillRegistration(page, newUsername(), { password: 'short' })
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByLabel('Password', { exact: true })).toHaveAccessibleDescription('Use at least 8 characters.')
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
    expect(sent).toEqual([])
  })

  test.describe('with a 400 the browser logs', () => {
    test.use(logged(400))

    test('every field the backend rejects in a 400 lands on its own field', async ({ page, request }) => {
      // The browser would stop a bad form before the backend saw it, so: ask the real backend for a 400 with
      // every field wrong, and hand its real answer to the page.
      const response = await request.post('/api/customers/register', {
        data: { username: 'a b', password: 'x', fullName: '' },
      })
      expect(response.status()).toBe(400)
      const body = (await response.json()) as { status: number; message: string }
      for (const field of ['username', 'password', 'fullName']) expect(body.message).toContain(`${field} `)

      await page.route('**/api/customers/register', (route) => route.fulfill({ status: 400, json: body }))
      await page.goto('/register')
      await fillRegistration(page, newUsername())
      await page.getByRole('button', { name: 'Create account' }).click()

      await expect(page.getByLabel('Username')).toHaveAccessibleDescription(/^Username may contain only letters/)
      await expect(page.getByLabel('Password', { exact: true })).toHaveAccessibleDescription(
        /^Password must be between 8 and 72/,
      )
      await expect(page.getByLabel('Full name')).toHaveAccessibleDescription('Full name must not be blank')
      await expect(page.getByLabel('Username')).toBeFocused()
      await expect(page.getByRole('alert')).toHaveCount(0)
    })
  })

  test('the password can be shown and hidden, and the form works by keyboard alone', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Username').fill(newUsername())
    await page.keyboard.press('Tab')
    await page.keyboard.type(password)
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible()
  })
})

test.describe('sign in', () => {
  test.describe('with a 401 the browser logs', () => {
    test.use(logged(401))

    test('a wrong password says so and keeps what was typed', async ({ page, request }) => {
      const username = newUsername()
      await createAccount(request, username)
      await page.goto('/sign-in')

      await page.getByLabel('Username').fill(username)
      await page.getByLabel('Password', { exact: true }).fill('not the password')
      await page.getByRole('button', { name: 'Sign in' }).click()

      await expect(page.getByRole('alert')).toContainText('Wrong username or password.')
      await expect(page.getByLabel('Username')).toHaveValue(username)
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    })
  })
})
