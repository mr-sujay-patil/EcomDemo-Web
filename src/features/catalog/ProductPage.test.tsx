import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

describe('the product page', () => {
  it('shows a loading message, then the product', async () => {
    renderRoute('/products/1')

    expect(await screen.findByRole('status')).toHaveTextContent('Loading the product…')
    expect(await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows category, price, description and a stock hint', async () => {
    renderRoute('/products/2')

    expect(await screen.findByRole('heading', { level: 1, name: 'Test Sofa' })).toBeInTheDocument()
    expect(screen.getByText('Category: Furniture')).toBeInTheDocument()
    expect(screen.getByText('₹1,25,000.50')).toBeInTheDocument()
    expect(screen.getByText('Fixture product')).toBeInTheDocument()
    expect(screen.getByText('Only 1 left')).toBeInTheDocument()
  })

  it.each([
    [0, 'Out of stock'],
    [5, 'Only 5 left'],
    [18, '18 in stock'],
  ])('says "%s units" as "%s"', async (stockQuantity, hint) => {
    server.use(
      http.get('/api/products/:id', () =>
        HttpResponse.json({ id: 9, name: 'Thing', description: '', price: 10, stockQuantity, category: null }),
      ),
    )
    renderRoute('/products/9')

    expect(await screen.findByText(hint)).toBeInTheDocument()
    expect(screen.getByText('Category: Other')).toBeInTheDocument()
  })

  it('has a disabled Add to cart button that points to signing in', async () => {
    renderRoute('/products/1')
    await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })

    const button = screen.getByRole('button', { name: 'Add to cart' })

    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Sign in to add to your cart')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })

  it('says "No longer available", with a way back, for a product the backend does not have', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/products/404')

    expect(await screen.findByRole('heading', { level: 1, name: 'No longer available' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to all products' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it.each(['abc', '1.5', '0', '-4'])('treats /products/%s as no product, without asking the server', async (id) => {
    let requests = 0
    server.use(
      http.get('/api/products/:id', () => {
        requests++
        return HttpResponse.json({ status: 404, message: 'x' }, { status: 404 })
      }),
    )
    renderRoute(`/products/${id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'No longer available' })).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('shows the server’s message, a reference and a Retry button on a 500, and recovers on retry', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(
        '/api/products/:id',
        () =>
          HttpResponse.json(
            { status: 500, message: 'The catalogue is unavailable right now.' },
            { status: 500, headers: { 'X-Correlation-Id': 'ref-for-support' } },
          ),
        { once: true },
      ),
    )
    renderRoute('/products/1')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The catalogue is unavailable right now.')
    expect(alert).toHaveTextContent('ref-for-support')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })).toBeInTheDocument()
  })

  it('opens from the product list by link', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(await screen.findByRole('link', { name: 'Test Sofa' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Test Sofa' })).toBeInTheDocument()
  })
})
