import { expect, test } from './fixtures'
import { routePages, signedInFor, visit } from './screens'

test.describe('every route, by direct URL', () => {
  // The same URL a user pastes or reloads: the preview server must answer it with the app, not a 404.
  // The pages anyone may see.
  for (const { path, h1, title } of routePages.filter((page) => !(page.path in signedInFor))) {
    test(`${path} shows "${h1}"`, async ({ page }) => {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
      await expect(page).toHaveTitle(`EcomDemo · ${title}`)
    })
  }

  // The guarded pages are opened the way a person gets there: signed in (answers stubbed), without a reload in between.
  for (const { path, h1, title } of routePages.filter((page) => page.path in signedInFor)) {
    const role = signedInFor[path] ?? 'CUSTOMER'

    test(`${path} shows "${h1}" to a signed-in ${role.toLowerCase()}`, async ({ page }) => {
      await visit(page, path, role)

      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
      await expect(page).toHaveTitle(`EcomDemo · ${title}`)
    })
  }

  test('the product list is the home page', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    await expect(page).toHaveTitle('EcomDemo · Products')
  })

  test('an admin sub-path loads the admin area', async ({ page }) => {
    await visit(page, '/admin/products/new', 'ADMIN')

    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible()
  })
})

test.describe('by navigation', () => {
  test('the header and footer links move between pages without reloading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    // A full page load would drop this marker.
    await page.evaluate(() => {
      ;(window as unknown as { stayedInTheApp: boolean }).stayedInTheApp = true
    })

    const header = page.getByRole('banner')
    const footer = page.getByRole('contentinfo')
    const steps = [
      // Signed out, the cart asks to sign in and remembers where the person was going.
      [header.getByRole('link', { name: 'Cart' }), 'Sign in', '/sign-in?next=%2Fcart'],
      [header.getByRole('link', { name: 'Sign in' }), 'Sign in', '/sign-in'],
      [footer.getByRole('link', { name: 'Returns' }), 'Returns', '/returns'],
      [footer.getByRole('link', { name: 'Shipping' }), 'Shipping', '/shipping'],
      [footer.getByRole('link', { name: 'Privacy' }), 'Privacy', '/privacy'],
      [footer.getByRole('link', { name: 'Terms' }), 'Terms', '/terms'],
      [footer.getByRole('link', { name: 'About' }), 'About', '/about'],
      [header.getByRole('link', { name: 'EcomDemo' }), 'Everything for the desk', '/'],
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

test.describe('the header search', () => {
  test('sends what was typed to /search, in the URL', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()

    await page.getByRole('banner').getByRole('combobox', { name: 'Search products' }).fill('something to type on')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { level: 1, name: 'Results for “something to type on”' })).toBeVisible()
    await expect(page).toHaveURL(/\/search\?q=something\+to\+type\+on$/)
  })
})

test.describe('the 404 page', () => {
  test('explains itself and links home', async ({ page }) => {
    await page.goto('/no/such/page')

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to the products' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
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
  test('the admin and order code is downloaded only when its route is opened', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (request) => {
      const name = /\/assets\/(AdminPage|OrderPage)-[\w-]+\.js$/.exec(request.url())?.[1]
      if (name) chunks.push(name)
    })

    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeVisible()
    expect(chunks, 'the home page must not download them').toEqual([])

    await visit(page, '/orders/42', 'CUSTOMER')
    await expect(page.getByRole('heading', { level: 1, name: 'Order #42' })).toBeVisible()
    expect(chunks).toEqual(['OrderPage'])

    await visit(page, '/admin', 'ADMIN')
    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible()
    expect(chunks).toEqual(['OrderPage', 'AdminPage'])
  })
})
