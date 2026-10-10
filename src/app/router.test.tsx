import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Role } from '@/features/auth/session'
import { renderRoute } from '@/test/render'
import { createAppRouter } from './router'
import { preloadAdminConsole } from '@/test/preloadAdminConsole'

// One row per route in src/app/router.tsx: the path to visit, its h1 and its document title.
const pages = [
  ['/', 'Everything for the desk', 'EcomDemo · Products'],
  ['/styleguide', 'Style guide', 'EcomDemo · Style guide'],
  ['/products/1', 'Test Kettle', 'EcomDemo · Product'],
  ['/products/7', 'No longer available', 'EcomDemo · Product'],
  ['/search', 'Search', 'EcomDemo · Search'],
  ['/cart', 'Your cart', 'EcomDemo · Your cart'],
  ['/orders', 'Your orders', 'EcomDemo · Your orders'],
  ['/orders/42', 'Order #42', 'EcomDemo · Order #42'],
  ['/account', 'Your account', 'EcomDemo · Your account'],
  ['/sign-in', 'Sign in', 'EcomDemo · Sign in'],
  ['/register', 'Create an account', 'EcomDemo · Create an account'],
  ['/admin', 'Products', 'EcomDemo · Products'],
  ['/admin/products/new', 'New product', 'EcomDemo · New product'],
  ['/about', 'About', 'EcomDemo · About'],
  ['/returns', 'Returns', 'EcomDemo · Returns'],
  ['/shipping', 'Shipping', 'EcomDemo · Shipping'],
  ['/privacy', 'Privacy', 'EcomDemo · Privacy'],
  ['/terms', 'Terms', 'EcomDemo · Terms'],
  ['/no/such/page', 'Page not found', 'EcomDemo · Page not found'],
] as const

/** Who must be signed in to see a path (src/app/router.tsx): customers for the shop's private pages, an admin for the console. */
function viewerOf(path: string): Role | undefined {
  if (path.startsWith('/admin')) return 'ADMIN'
  // `/cart` is open to everyone since Phase 24 (a visitor sees the guest cart); the table renders it for a customer.
  if (path === '/cart') return 'CUSTOMER'
  const customerOnly = ['/checkout', '/orders', '/account']
  return customerOnly.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ? 'CUSTOMER' : undefined
}

// The admin console is a lazy route: load it outside the first test's clock (web KI-029).
beforeAll(preloadAdminConsole)

describe('routes', () => {
  it.each(pages)('%s renders its h1 and sets the document title', async (path, heading, title) => {
    renderRoute(path, { signedInAs: viewerOf(path) })

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    // The layout sets the title in an effect, which can land just after the h1 shows (on a lazy route, under load).
    await waitFor(() => {
      expect(document.title).toBe(title)
    })
  })

  it('leaves every owner-written paragraph marked TODO(owner)', async () => {
    renderRoute('/returns')

    await screen.findByRole('heading', { level: 1, name: 'Returns' })
    const paragraphs = within(screen.getByRole('main')).getAllByText(/TODO\(owner\)/)
    expect(paragraphs).toHaveLength(screen.getAllByRole('heading', { level: 2 }).length)
  })
})

describe('layout', () => {
  it('has a header, a main region and a footer', async () => {
    renderRoute('/about')

    await screen.findByRole('heading', { level: 1, name: 'About' })
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('moves focus to the main region when the skip link is used', async () => {
    const user = userEvent.setup()
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.click(screen.getByRole('link', { name: 'Skip to content' }))

    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('makes the skip link the first stop for the keyboard', async () => {
    const user = userEvent.setup()
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.tab()

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
  })

  it('moves focus to the new page heading after a navigation, but not on first load', async () => {
    const user = userEvent.setup()
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })
    expect(document.body).toHaveFocus()

    await user.click(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Returns' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Returns' })).toHaveFocus()
  })

  it('leaves focus alone on a page that has no heading yet (a redirect on its way), and does not fail', async () => {
    const { router } = renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    // Signed out, /orders renders only a redirect to sign-in: the address changes before any h1 exists.
    await act(() => router.navigate('/orders'))

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it.each([
    ['About', 'About'],
    ['Returns', 'Returns'],
    ['Shipping', 'Shipping'],
    ['Privacy', 'Privacy'],
    ['Terms', 'Terms'],
  ])('the footer link "%s" opens the %s page', async (link, heading) => {
    const user = userEvent.setup()
    renderRoute('/search')
    await screen.findByRole('heading', { level: 1, name: 'Search' })

    await user.click(within(screen.getByRole('contentinfo')).getByRole('link', { name: link }))

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  // Since Phase 24 the cart link leads a visitor to their guest cart, not to sign-in.
  it('links the store name to the product list, and signed out the cart link leads to the guest cart', async () => {
    const user = userEvent.setup()
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })
    const header = within(screen.getByRole('banner'))

    await user.click(header.getByRole('link', { name: 'Cart' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Your cart' })).toBeInTheDocument()
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    await user.click(header.getByRole('link', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    await user.click(header.getByRole('link', { name: 'EcomDemo' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeInTheDocument()
  })

  it('sends an empty search to /search without a query', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.type(within(screen.getByRole('banner')).getByRole('combobox', { name: 'Search products' }), '   {Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('moves focus to the main area from the skip link', async () => {
    const user = userEvent.setup()
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.click(screen.getByRole('link', { name: 'Skip to content' }))

    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('sends a search from the header to /search with the words in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.type(
      within(screen.getByRole('banner')).getByRole('combobox', { name: 'Search products' }),
      'something to type on{Enter}',
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “something to type on”' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('something to type on')
  })

  it('shows the owner placeholders from site.ts in the footer', async () => {
    renderRoute('/about')

    await screen.findByRole('heading', { level: 1, name: 'About' })
    expect(within(screen.getByRole('contentinfo')).getAllByText(/TODO\(owner\)/)).toHaveLength(3)
  })
})

describe('the browser router', () => {
  it('starts at the address bar and uses the same route table', () => {
    window.history.pushState({}, '', '/about')
    const router = createAppRouter()

    expect(router.state.location.pathname).toBe('/about')
    expect(router.state.matches.at(-1)?.route.path).toBe('about')
    router.dispose()
  })
})
