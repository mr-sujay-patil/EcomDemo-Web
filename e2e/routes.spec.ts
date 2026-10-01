import { expect, test } from './fixtures'
import { routePages } from './screens'

test.describe('every route, by direct URL', () => {
  // The same URL a user pastes or reloads: the preview server must answer it with the app, not a 404.
  for (const { path, h1, title } of routePages) {
    test(`${path} shows "${h1}"`, async ({ page }) => {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
      await expect(page).toHaveTitle(`EcomDemo · ${title}`)
    })
  }

  test('the product list is the home page', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible()
    await expect(page).toHaveTitle('EcomDemo · Products')
  })

  test('an admin sub-path loads the admin area', async ({ page }) => {
    await page.goto('/admin/products/new')

    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible()
  })
})

test.describe('by navigation', () => {
  test('the header and footer links move between pages without reloading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible()
    // A full page load would drop this marker.
    await page.evaluate(() => {
      ;(window as unknown as { stayedInTheApp: boolean }).stayedInTheApp = true
    })

    const header = page.getByRole('banner')
    const footer = page.getByRole('contentinfo')
    const steps = [
      [header.getByRole('link', { name: 'Cart' }), 'Your cart', '/cart'],
      [header.getByRole('link', { name: 'Search' }), 'Search', '/search'],
      [footer.getByRole('link', { name: 'Returns' }), 'Returns', '/returns'],
      [footer.getByRole('link', { name: 'Shipping' }), 'Shipping', '/shipping'],
      [footer.getByRole('link', { name: 'Privacy' }), 'Privacy', '/privacy'],
      [footer.getByRole('link', { name: 'Terms' }), 'Terms', '/terms'],
      [footer.getByRole('link', { name: 'About' }), 'About', '/about'],
      [header.getByRole('link', { name: 'EcomDemo' }), 'Products', '/'],
    ] as const
    for (const [link, h1, path] of steps) {
      await link.click()
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
      await expect(page).toHaveURL(path)
    }

    expect(await page.evaluate(() => (window as unknown as { stayedInTheApp?: boolean }).stayedInTheApp)).toBe(true)
  })

  test('the back button returns to the previous page', async ({ page }) => {
    await page.goto('/about')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Returns' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Returns' })).toBeVisible()

    await page.goBack()

    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()
    await expect(page).toHaveTitle('EcomDemo · About')
  })

  test('the new page heading takes focus, so a screen reader announces the page', async ({ page }) => {
    await page.goto('/about')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Shipping' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Shipping' })).toBeFocused()
  })
})

test.describe('the 404 page', () => {
  test('explains itself and links home', async ({ page }) => {
    await page.goto('/no/such/page')

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to the products' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible()
  })
})

test.describe('the skip link', () => {
  test('is the first Tab stop and moves focus to the main region on Enter', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('main')).toBeFocused()
  })
})

test.describe('code splitting', () => {
  test('the admin and checkout code is downloaded only when its route is opened', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (request) => {
      const name = /\/assets\/(AdminPage|CheckoutPage)-[\w-]+\.js$/.exec(request.url())?.[1]
      if (name) chunks.push(name)
    })

    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible()
    expect(chunks, 'the home page must not download them').toEqual([])

    await page.goto('/checkout')
    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible()
    expect(chunks).toEqual(['CheckoutPage'])

    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible()
    expect(chunks).toEqual(['CheckoutPage', 'AdminPage'])
  })
})
