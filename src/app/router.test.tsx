import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { createAppRouter } from './router'

// One row per route in src/app/router.tsx: the path to visit, its h1 and its document title.
const pages = [
  ['/', 'Products', 'EcomDemo · Products'],
  ['/products/1', 'Test Kettle', 'EcomDemo · Product'],
  ['/products/7', 'No longer available', 'EcomDemo · Product'],
  ['/search', 'Search', 'EcomDemo · Search'],
  ['/cart', 'Your cart', 'EcomDemo · Your cart'],
  ['/checkout', 'Checkout', 'EcomDemo · Checkout'],
  ['/orders', 'Your orders', 'EcomDemo · Your orders'],
  ['/orders/42', 'Order', 'EcomDemo · Order'],
  ['/account', 'Your account', 'EcomDemo · Your account'],
  ['/sign-in', 'Sign in', 'EcomDemo · Sign in'],
  ['/register', 'Create an account', 'EcomDemo · Create an account'],
  ['/admin', 'Admin', 'EcomDemo · Admin'],
  ['/admin/products/new', 'Admin', 'EcomDemo · Admin'],
  ['/about', 'About', 'EcomDemo · About'],
  ['/returns', 'Returns', 'EcomDemo · Returns'],
  ['/shipping', 'Shipping', 'EcomDemo · Shipping'],
  ['/privacy', 'Privacy', 'EcomDemo · Privacy'],
  ['/terms', 'Terms', 'EcomDemo · Terms'],
  ['/no/such/page', 'Page not found', 'EcomDemo · Page not found'],
] as const

describe('routes', () => {
  it.each(pages)('%s renders its h1 and sets the document title', async (path, heading, title) => {
    renderRoute(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(document.title).toBe(title)
  })

  it('names the phase that builds a placeholder page', async () => {
    renderRoute('/cart')

    expect(await screen.findByText('This page is built in Phase 12.')).toBeInTheDocument()
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

  it.each([
    ['About', 'About'],
    ['Returns', 'Returns'],
    ['Shipping', 'Shipping'],
    ['Privacy', 'Privacy'],
    ['Terms', 'Terms'],
  ])('the footer link "%s" opens the %s page', async (link, heading) => {
    const user = userEvent.setup()
    renderRoute('/cart')
    await screen.findByRole('heading', { level: 1, name: 'Your cart' })

    await user.click(within(screen.getByRole('contentinfo')).getByRole('link', { name: link }))

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('links the store name to the product list and the header to search and cart', async () => {
    const user = userEvent.setup()
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })
    const header = within(screen.getByRole('banner'))

    await user.click(header.getByRole('link', { name: 'Cart' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Your cart' })).toBeInTheDocument()
    await user.click(header.getByRole('link', { name: 'Search' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument()
    await user.click(header.getByRole('link', { name: 'EcomDemo' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument()
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
