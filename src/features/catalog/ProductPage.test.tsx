import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fakeCart } from '@/test/msw/cart'
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
    expect(screen.getByText('Furniture')).toBeInTheDocument()
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
        HttpResponse.json({
          id: 9,
          name: 'Thing',
          description: '',
          price: 10,
          stockQuantity,
          category: null,
          imageUrl: null,
        }),
      ),
    )
    renderRoute('/products/9')

    expect(await screen.findByText(hint)).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('sends someone who is signed out to sign in, and back here', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/products/1')
    await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(router.state.location.pathname).toBe('/sign-in')
    expect(router.state.location.search).toBe('?next=%2Fproducts%2F1')
  })

  it('adds to the cart for a customer, and then says how many are in it', async () => {
    const cart = fakeCart()
    server.use(...cart.handlers)
    const user = userEvent.setup()
    renderRoute('/products/1', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(await screen.findByRole('button', { name: 'In your cart (1)' })).toBeInTheDocument()
    expect(cart.calls).toEqual(['POST 1 x1'])
    expect(screen.getByRole('link', { name: 'Cart, 1 item' })).toBeInTheDocument()
  })

  it('shows the button busy while the add is on its way', async () => {
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.post('/api/cart/items', async () => {
        await held
        return HttpResponse.json({ id: 1, items: [], totalAmount: 0 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/products/1', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(screen.getByRole('button', { name: 'Add to cart' })).toHaveAttribute('aria-busy', 'true')
    release()
  })

  it('shows why the server refused an add', async () => {
    server.use(...fakeCart({ refuse: { status: 404, message: 'Product 1 not found' } }).handlers)
    const user = userEvent.setup()
    renderRoute('/products/1', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Product 1 not found')
  })

  it('offers an admin no Add to cart', async () => {
    renderRoute('/products/1', { signedInAs: 'ADMIN' })
    await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })

    expect(screen.queryByRole('button', { name: /cart/i })).not.toBeInTheDocument()
  })

  it('says "No longer available", with a way back, for a product the backend does not have', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/products/404')

    expect(await screen.findByRole('heading', { level: 1, name: 'No longer available' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to all products' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeInTheDocument()
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
