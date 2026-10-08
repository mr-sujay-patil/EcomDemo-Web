import { expect, test } from './fixtures'
import { unavailableResponseError } from './screens'

// The real backend decides whether search by meaning works (an embedding model must be configured, backend Phase 28), so
// the specs on the real path accept either answer: ranked results, or the notice and the word-matching fallback. The
// fallback path is also forced with a stubbed 503 so it is always exercised.
const unavailable = { status: 503, message: 'Semantic search is not configured.' }

test.describe('search', () => {
  // The browser logs a 503 itself, whether the backend or a stub sent it.
  test.use({ allowedConsoleErrors: [unavailableResponseError] })

  test('"something to type on" gives results or the fallback notice, and the URL round-trips', async ({ page }) => {
    await page.goto('/')
    const box = page.getByRole('banner').getByRole('combobox', { name: 'Search products' })
    await box.fill('something to type on')
    await box.press('Enter')

    await expect(page).toHaveURL(/\/search\?q=something\+to\+type\+on$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Results for “something to type on”' })).toBeVisible()
    // Either mode ends with a caption (a count, or "Nothing matches"); the fallback adds the notice above it, so the two are
    // not alternatives and the caption is what says the search finished.
    await expect(page.getByText(/^\d+ products?, |^Nothing matches/)).toBeVisible()

    // The address alone brings the same search back: a shared link, or a reload.
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Results for “something to type on”' })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('combobox', { name: 'Search products' })).toHaveValue(
      'something to type on',
    )
  })

  test('with search by description off, the page says so and matches words in the catalogue', async ({ page }) => {
    await page.route('**/api/products/search*', (route) =>
      route.fulfill({ status: 503, json: unavailable, headers: { 'Retry-After': '30' } }),
    )
    await page.goto('/search?q=keyboard')

    await expect(page.getByText("Search by description isn't available right now")).toBeVisible()
    await expect(page.getByText(/matched on words in the name and description/)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /keyboard/i }).first()).toBeVisible()
  })

  test('typing fast sends one suggestion request, after the typing, not one per keystroke', async ({ page }) => {
    const requests: { q: string; at: number }[] = []
    await page.route('**/api/products/search*', (route) => {
      requests.push({ q: new URL(route.request().url()).searchParams.get('q') ?? '', at: Date.now() })
      return route.fulfill({ status: 503, json: unavailable })
    })
    await page.goto('/about')

    // Eight keystrokes 40 ms apart: each is closer than the 300 ms pause, so nothing may be sent before the last one.
    await page
      .getByRole('banner')
      .getByRole('combobox', { name: 'Search products' })
      .pressSequentially('keyboard', { delay: 40 })
    const typedAt = Date.now()
    await expect.poll(() => requests.length, { timeout: 5_000 }).toBe(1)

    expect(requests[0]?.q).toBe('keyboard')
    expect(requests[0]?.at).toBeGreaterThanOrEqual(typedAt)
  })

  test('suggestions open a product with the keyboard', async ({ page }) => {
    const hit = {
      id: 1,
      name: 'Mechanical Keyboard',
      description: 'Stub',
      price: 4999,
      stockQuantity: 5,
      category: 'PERIPHERALS',
      imageUrl: null,
    }
    await page.route('**/api/products/search*', (route) =>
      route.fulfill({ json: { query: 'keyboard', results: [{ product: hit, similarity: 0.8 }] } }),
    )
    await page.goto('/about')

    const box = page.getByRole('banner').getByRole('combobox', { name: 'Search products' })
    await box.fill('keyboard')
    await expect(page.getByRole('option', { name: /Mechanical Keyboard/ })).toBeVisible()
    await box.press('ArrowDown')
    await box.press('Enter')

    await expect(page).toHaveURL(/\/products\/1$/)
  })
})
