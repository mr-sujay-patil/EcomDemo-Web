import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeCart } from '@/test/msw/cart'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

async function openCart(initial = [{ productId: 1, quantity: 1 }], options = {}) {
  const cart = fakeCart({ initial, ...options })
  server.use(...cart.handlers)
  const user = userEvent.setup()
  const rendered = renderRoute('/cart', { signedInAs: 'CUSTOMER' })
  await screen.findByRole('heading', { level: 1, name: 'Your cart' })
  await waitFor(() => expect(screen.queryByText('Loading your cart…')).not.toBeInTheDocument())
  return { cart, user, ...rendered }
}

describe('the cart page', () => {
  afterEach(() => vi.useRealTimers())

  it('sends someone who is signed out to sign in and back', async () => {
    const { router } = renderRoute('/cart')

    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    expect(router.state.location.search).toBe('?next=%2Fcart')
  })

  it('shows a loading message, then the lines with the server totals', async () => {
    const cart = fakeCart({
      initial: [
        { productId: 1, quantity: 2 },
        { productId: 3, quantity: 1 },
      ],
    })
    server.use(...cart.handlers)
    renderRoute('/cart', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText('Loading your cart…')).toBeInTheDocument()
    const lines = await screen.findAllByRole('listitem')
    expect(lines).toHaveLength(2)
    expect(within(lines[0]!).getByText('Test Kettle')).toBeInTheDocument()
    expect(within(lines[0]!).getByText('₹2,598.00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getByText('₹3,098.00')).toBeInTheDocument()
  })

  it('shows the price the line was added at, not the product price', async () => {
    // The shelf says ₹1,299 for the kettle; the cart's line was added when it cost ₹999.
    await openCart([{ productId: 1, quantity: 1 }], { priceAtAdd: { 1: 999 } })

    const line = screen.getByRole('listitem')
    expect(within(line).getByText('₹999.00 each')).toBeInTheDocument()
    expect(within(line).getByText('price when added')).toBeInTheDocument()
    expect(within(line).queryByText(/1,299/)).not.toBeInTheDocument()
  })

  it('moves the stepper at once, and takes the totals from the answer', async () => {
    const { cart, user } = await openCart()
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.put('/api/cart/items/:id', async () => {
        await held
        return HttpResponse.json(cart.view())
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    // The request is still in flight: the number moved, the money did not (only the server adds).
    expect(
      within(screen.getByRole('group', { name: 'Quantity of Test Kettle' })).getByRole('status'),
    ).toHaveTextContent('2')
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getByText('₹1,299.00')).toBeInTheDocument()
    release()
  })

  it('replaces the whole cart with the answer', async () => {
    const { cart, user } = await openCart()

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    const summary = screen.getByRole('region', { name: 'Order summary' })
    expect(await within(summary).findByText('₹2,598.00')).toBeInTheDocument()
    expect(cart.calls).toEqual(['PUT 1 x2'])
  })

  it('puts the quantity back and says why when the server refuses', async () => {
    const { user } = await openCart()
    server.use(
      http.put('/api/cart/items/:id', () =>
        HttpResponse.json({ status: 400, message: 'Quantity must be at most 1' }, { status: 400 }),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Quantity must be at most 1')
    const group = screen.getByRole('group', { name: 'Quantity of Test Kettle' })
    expect(within(group).getByRole('status')).toHaveTextContent('1')
  })

  it('removes a line and offers Undo, which adds it back', async () => {
    const { cart, user } = await openCart([{ productId: 1, quantity: 3 }])

    await user.click(screen.getByRole('button', { name: 'Remove Test Kettle' }))

    expect(await screen.findByText('Test Kettle removed.')).toBeInTheDocument()
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    const summary = await screen.findByRole('region', { name: 'Order summary' })
    expect(within(summary).getByText('₹3,897.00')).toBeInTheDocument()
    expect(cart.calls).toEqual(['DELETE 1', 'POST 1 x3'])
    expect(screen.queryByText('Test Kettle removed.')).not.toBeInTheDocument()
  })

  it('stops offering Undo after five seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await openCart()

    await user.click(screen.getByRole('button', { name: 'Remove Test Kettle' }))
    await screen.findByText('Test Kettle removed.')
    await act(() => vi.advanceTimersByTimeAsync(5001))

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('has an empty state that leads back to the shelf and no checkout button', async () => {
    await openCart([])

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the shelf' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: 'Checkout' })).not.toBeInTheDocument()
  })

  it('shows the error with a retry when the cart cannot be loaded', async () => {
    server.use(
      http.get('/api/cart', () => HttpResponse.json({ status: 503, message: 'Cart is unavailable' }, { status: 503 })),
    )
    renderRoute('/cart', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText('Cart is unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('retries loading the cart', async () => {
    let answered = false
    const cart = fakeCart({ initial: [{ productId: 1, quantity: 1 }] })
    server.use(
      http.get('/api/cart', () => {
        if (answered) return HttpResponse.json(cart.view())
        answered = true
        return HttpResponse.json({ status: 503, message: 'Cart is unavailable' }, { status: 503 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/cart', { signedInAs: 'CUSTOMER' })
    await user.click(await screen.findByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Test Kettle')).toBeInTheDocument()
  })

  it('lets the refusal message go', async () => {
    const { user } = await openCart()
    server.use(
      http.put('/api/cart/items/:id', () => HttpResponse.json({ status: 400, message: 'Nope' }, { status: 400 })),
    )
    await user.click(screen.getByRole('button', { name: 'Increase' }))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows why a removal failed', async () => {
    const { user } = await openCart()
    server.use(
      http.delete('/api/cart/items/:id', () => HttpResponse.json({ status: 404, message: 'Gone' }, { status: 404 })),
    )

    await user.click(screen.getByRole('button', { name: 'Remove Test Kettle' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Gone')
    expect(screen.queryByText('Test Kettle removed.')).not.toBeInTheDocument()
  })

  it('keeps the quantities in order when the stepper is clicked twice quickly', async () => {
    const { cart, user } = await openCart()

    await user.click(screen.getByRole('button', { name: 'Increase' }))
    await user.click(screen.getByRole('button', { name: 'Increase' }))

    const summary = screen.getByRole('region', { name: 'Order summary' })
    expect(await within(summary).findByText('₹3,897.00')).toBeInTheDocument()
    expect(cart.calls).toEqual(['PUT 1 x2', 'PUT 1 x3'])
  })
})
