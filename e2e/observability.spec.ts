import { expect, test } from './fixtures'

// What Phase 23 promises: a call can be followed from the browser into the backend (the headers), and when one fails the
// shopper gets a reference to quote (the page). docs/troubleshooting.md follows a reference from the screen to Grafana.

const traceparent = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/

test('every fetch to /api carries a traceparent and an X-Correlation-Id', async ({ page }) => {
  const calls: Array<{ url: string; headers: Record<string, string> }> = []
  // `fetch` only: an <img> (the product photos) is a plain browser request that no script touches, so it carries neither header.
  page.on('request', (request) => {
    if (request.resourceType() === 'fetch' && new URL(request.url()).pathname.startsWith('/api/'))
      calls.push({ url: request.url(), headers: request.headers() })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
  await page
    .getByRole('link', { name: /Mechanical Keyboard/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Mechanical Keyboard' })).toBeVisible()

  expect(calls.length).toBeGreaterThan(0)
  for (const { url, headers } of calls) {
    expect(headers['traceparent'], url).toMatch(traceparent)
    expect(headers['x-correlation-id'], url).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  }
  // One trace per call: the trace ids are all different.
  const traceIds = calls.map(({ headers }) => headers['traceparent']?.split('-')[1])
  expect(new Set(traceIds).size).toBe(traceIds.length)
})

test('nothing but /api calls carries a traceparent', async ({ page }) => {
  const others: string[] = []
  page.on('request', (request) => {
    const { pathname } = new URL(request.url())
    if (!pathname.startsWith('/api/') && request.headers()['traceparent']) others.push(request.url())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()

  expect(others).toEqual([])
})

test.describe('when the catalogue is down', () => {
  // The browser's own line for a failed response; the page is the thing under test.
  test.use({ allowedConsoleErrors: [/Failed to load resource/] })

  const down = {
    status: 503,
    headers: { 'X-Correlation-Id': 'e2e-down-00000001', 'Retry-After': '10' },
    contentType: 'application/json',
    body: JSON.stringify({
      status: 503,
      message: 'The product catalogue is temporarily unavailable. Please try again shortly.',
    }),
  }

  test('the shelf shows what happened, a reference, and a way to copy it, with the layout still usable', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.route(/\/api\/products(\?.*)?$/, (route) => route.fulfill(down))

    await page.goto('/')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('temporarily unavailable')
    await expect(alert).toContainText('e2e-down-00000001')
    // The header and the footer are still there, so the shopper can go somewhere else.
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    await alert.getByRole('button', { name: 'Copy reference' }).click()
    await expect(alert.getByText('Copied.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('e2e-down-00000001')
  })

  test('Retry asks again, and the shelf comes back once the catalogue does', async ({ page }) => {
    let up = false
    await page.route(/\/api\/products(\?.*)?$/, (route) => (up ? route.fallback() : route.fulfill(down)))
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('e2e-down-00000001')

    up = true
    await page.getByRole('button', { name: 'Retry' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

// The real thing: needs one backend service actually stopped. `scripts/e2e-service-down.sh` stops the catalogue service,
// runs only this test, and starts the service again. Skipped in every other run.
test.describe('with the catalogue service really stopped', () => {
  // A conditional skip, not a disabled test: it runs whenever the service really is down (scripts/e2e-service-down.sh).
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!process.env.E2E_SERVICE_DOWN, 'run it with scripts/e2e-service-down.sh')
  test.use({ allowedConsoleErrors: [/Failed to load resource/] })

  test('the shelf shows a reference, the one the gateway logged', async ({ page }) => {
    const sent: string[] = []
    page.on('request', (request) => {
      const id = request.headers()['x-correlation-id']
      if (request.resourceType() === 'fetch' && request.url().includes('/api/products') && id) sent.push(id)
    })

    await page.goto('/')

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    const reference = (await alert.locator('code').innerText()).trim()
    // The gateway reuses the id the page sent (src/api/client.ts), so the reference is one of the ids in the requests.
    expect(sent).toContain(reference)
    console.log(`E2E_REFERENCE=${reference}`)
  })
})
