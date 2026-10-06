import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures'

// These specs sign in with real accounts they create (a correct sign-in is never throttled; only a failed one is,
// docs/backend/phase-33-delta.md, and none of these fails one). A session lives in memory, so a full page load
// signs the person out: every "go to" below that must keep the session is a click, not a `goto`.
const password = 'correct horse battery'
const newUsername = () => `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

async function createAccount(request: APIRequestContext) {
  const username = newUsername()
  const response = await request.post('/api/customers/register', {
    data: { username, password, fullName: 'E2E Person' },
  })
  expect(response.status()).toBe(201)
  return username
}

async function signIn(page: Page, username: string) {
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('sign in and out', () => {
  test('signs in, shows the name, signs out, and a protected page asks to sign in and returns afterwards', async ({
    page,
    request,
  }) => {
    const username = await createAccount(request)
    await page.goto('/sign-in')

    await signIn(page, username)

    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    const menu = page.getByRole('button', { name: 'Account: E2E' })
    await expect(menu).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: 'Admin' })).toHaveCount(0)

    await menu.click()
    await expect(page.getByRole('link', { name: 'My orders' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toHaveCount(0)

    // Signed out, a protected page is served by the app and asks to sign in, remembering where they were going.
    const response = await page.goto('/orders')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL('/sign-in?next=%2Forders')
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()

    await signIn(page, username)

    await expect(page).toHaveURL('/orders')
    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()
  })

  test('a protected page opened signed out keeps its query when it comes back', async ({ page, request }) => {
    const username = await createAccount(request)

    await page.goto('/account?tab=items')
    await expect(page).toHaveURL('/sign-in?next=%2Faccount%3Ftab%3Ditems')
    await signIn(page, username)

    await expect(page).toHaveURL('/account?tab=items')
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
  })

  test('a reload signs the person out, and the sign-in page says it is so', async ({ page, request }) => {
    const username = await createAccount(request)
    await page.goto('/sign-in')
    await expect(page.getByText(/until your session ends or you reload the page/)).toBeVisible()
    await signIn(page, username)
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toBeVisible()

    await page.reload()

    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account: E2E' })).toHaveCount(0)
  })

  test('keeps the token nowhere: not in storage, not in cookies, not in the address, not on the page', async ({
    page,
    request,
  }) => {
    const username = await createAccount(request)
    const tokens: string[] = []
    page.on('response', async (response) => {
      if (new URL(response.url()).pathname === '/api/auth/login' && response.ok()) {
        tokens.push(((await response.json()) as { accessToken: string }).accessToken)
      }
    })
    await page.goto('/sign-in?next=%2Forders')

    await signIn(page, username)
    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible()

    expect(tokens).toHaveLength(1)
    const stored = await page.evaluate(() => ({
      local: Object.entries(localStorage),
      session: Object.entries(sessionStorage),
      cookie: document.cookie,
      url: location.href,
      text: document.body.innerHTML,
    }))
    expect(stored.local).toEqual([])
    expect(stored.session).toEqual([])
    expect(stored.cookie).toBe('')
    expect(stored.url).not.toContain(tokens[0])
    expect(stored.text).not.toContain(tokens[0])
  })
})

test.describe('who may see what', () => {
  // The browser logs the 403-free page itself as nothing: the console guard stays on for this one.
  test('a customer on /admin sees "Not permitted", in place, not a sign-in prompt', async ({ page, request }) => {
    const username = await createAccount(request)
    await page.goto('/sign-in?next=%2Fadmin')

    await signIn(page, username)

    await expect(page.getByRole('heading', { level: 1, name: 'Not permitted' })).toBeVisible()
    await expect(page).toHaveURL('/admin')
    await expect(page).toHaveTitle('EcomDemo · Not permitted')
    await expect(page.getByLabel('Username')).toHaveCount(0)
    await expect(page.getByRole('banner').getByRole('link', { name: 'Admin' })).toHaveCount(0)
  })
})

test.describe('a session that ends on the person', () => {
  // The real token lasts 15 minutes. The page's clock is faked and moved on, so the spec does not wait.
  test('warns a minute before, then signs out, remembers the page, and says why', async ({ page, request }) => {
    const username = await createAccount(request)
    await page.clock.install()
    await page.goto('/sign-in?next=%2Forders')
    await signIn(page, username)
    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible()
    await expect(page.getByText("You'll be signed out in a minute")).toHaveCount(0)

    await page.clock.fastForward('14:10')
    await expect(page.getByText("You'll be signed out in a minute")).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible()

    await page.clock.fastForward('01:00')

    await expect(page).toHaveURL('/sign-in?next=%2Forders')
    await expect(page.getByText(/Your session ended, so we signed you out/)).toBeVisible()
    await expect(page.getByText("You'll be signed out in a minute")).toHaveCount(0)
  })
})

test.describe('a throttled login', () => {
  // The browser logs the stubbed 429 itself, even though the app handles it. Stubbed: a real one costs login throttle slots.
  test.use({ allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 429/] })

  test('counts down on the button, and enables it again when the wait is over', async ({ page }) => {
    await page.clock.install()
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '30' },
        json: { status: 429, message: 'Too many failed sign-ins.' },
      }),
    )
    await page.goto('/sign-in')

    await page.getByLabel('Username').fill('someone')
    await page.getByLabel('Password', { exact: true }).fill('not the password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toContainText('Too many sign-in attempts.')
    const waiting = page.getByRole('button', { name: /^Try again in \d+ s$/ })
    await expect(waiting).toBeDisabled()

    await page.clock.fastForward('00:31')

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    await expect(page.getByRole('status')).toHaveText('You can try again now.')
  })
})
