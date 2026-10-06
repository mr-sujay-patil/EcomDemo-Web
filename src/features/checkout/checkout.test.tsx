import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeCart } from '@/test/msw/cart'
import { fakeOrders, orderFixture } from '@/test/msw/orders'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const kettle = { productId: 1, quantity: 2 }

/** The cart page with a cart and a shop behind it; the clock is the test's when `fake` is set. */
async function openCart(orderOptions: Partial<Parameters<typeof fakeOrders>[0]> = {}, fake = false) {
  if (fake) vi.useFakeTimers({ shouldAdvanceTime: true })
  const cart = fakeCart({ initial: [kettle] })
  const orders = fakeOrders({ cart: cart.view, takeCart: cart.clear, ...orderOptions })
  server.use(...cart.handlers, ...orders.handlers)
  const user = fake ? userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) : userEvent.setup()
  const rendered = renderRoute('/cart', { signedInAs: 'CUSTOMER' })
  await screen.findByRole('heading', { level: 1, name: 'Your cart' })
  await waitFor(() => expect(screen.queryByText('Loading your cart…')).not.toBeInTheDocument())
  return { cart, orders, user, ...rendered }
}

const placeOrder = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Place order' }))
const statusCalls = (orders: { calls: string[] }) => orders.calls.filter((call) => call.endsWith('/status')).length

describe('placing an order', () => {
  afterEach(() => vi.useRealTimers())

  it('goes to the order, which says it is being placed, and then confirms', async () => {
    const { orders, user, router } = await openCart({ statuses: ['PENDING', 'CONFIRMED'] })

    await placeOrder(user)

    expect(await screen.findByRole('heading', { level: 1, name: 'Order #100' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/orders/100')
    expect(screen.getByText('Placing your order. This usually takes a few seconds.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Items in this order' })).toHaveTextContent('Test Kettle')
    expect(screen.getByRole('region', { name: 'Items in this order' })).toHaveTextContent('₹2,598.00')
    expect(await screen.findByText('Your order is confirmed.', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(orders.calls.filter((call) => call === 'POST /api/orders')).toHaveLength(1)
    // No note until the owner writes one.
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('asks the server for the cart again after the order, and shows it empty', async () => {
    const { user } = await openCart()

    await placeOrder(user)
    await screen.findByRole('heading', { level: 1, name: 'Order #100' })
    await user.click(await screen.findByRole('link', { name: /^Cart/ }))

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
  })

  it('polls no faster than once a second and no slower than once every two', async () => {
    const { orders, user } = await openCart({ statuses: ['PENDING'] }, true)
    await placeOrder(user)
    await screen.findByText('Placing your order. This usually takes a few seconds.')
    await waitFor(() => expect(statusCalls(orders)).toBe(1))

    await act(() => vi.advanceTimersByTimeAsync(900))
    expect(statusCalls(orders)).toBe(1)
    await act(() => vi.advanceTimersByTimeAsync(1200))
    expect(statusCalls(orders)).toBe(2)
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(statusCalls(orders)).toBeGreaterThanOrEqual(6)
    expect(statusCalls(orders)).toBeLessThanOrEqual(12)
  })

  it('says it is taking longer after 15 s, keeps asking, and stops after 90 s', async () => {
    const { orders, user } = await openCart({ statuses: ['PENDING'] }, true)
    await placeOrder(user)
    await screen.findByText('Placing your order. This usually takes a few seconds.')

    await act(() => vi.advanceTimersByTimeAsync(14_000))
    expect(screen.queryByText(/Taking longer than usual/)).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(screen.getByText(/Taking longer than usual/)).toBeInTheDocument()
    const during = statusCalls(orders)
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(statusCalls(orders)).toBeGreaterThan(during)

    await act(() => vi.advanceTimersByTimeAsync(70_000))
    expect(screen.getByText('We stopped checking')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/orders')
    const stopped = statusCalls(orders)
    await act(() => vi.advanceTimersByTimeAsync(20_000))
    expect(statusCalls(orders)).toBe(stopped)
  })

  it('stops asking once the order is confirmed', async () => {
    const { orders, user } = await openCart({ statuses: ['CONFIRMED'] }, true)
    await placeOrder(user)
    await screen.findByText('Your order is confirmed.')
    const settled = statusCalls(orders)

    await act(() => vi.advanceTimersByTimeAsync(10_000))

    expect(statusCalls(orders)).toBe(settled)
  })
})

describe('an order that is cancelled', () => {
  afterEach(() => vi.useRealTimers())

  it('shows the reason and adds the items to the cart again', async () => {
    const reason = 'Payment declined: 12000.00 exceeds the limit of 10000.00'
    const { cart, user, router } = await openCart({ statuses: ['CANCELLED'], reason })
    await placeOrder(user)

    expect(await screen.findByText('Your order was cancelled')).toBeInTheDocument()
    expect(screen.getAllByText(reason).length).toBeGreaterThan(0)
    expect(screen.queryByText('Your order is confirmed.')).not.toBeInTheDocument()
    expect(cart.view().items).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Add these items to my cart again' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/cart'))
    expect(cart.calls).toContain('POST 1 x2')
    // Wait for the cart page itself: the order page also names the kettle, and is still there for a moment.
    await screen.findByRole('heading', { level: 1, name: 'Your cart' })
    const group = await screen.findByRole('group', { name: 'Quantity of Test Kettle' })
    expect(within(group).getByRole('status')).toHaveTextContent('2')
  })

  it('says which items could not be added, and stays', async () => {
    const { user, router } = await openCart({ statuses: ['CANCELLED'], reason: 'Insufficient stock' })
    await placeOrder(user)
    const again = await screen.findByRole('button', { name: 'Add these items to my cart again' })
    server.use(
      http.post('/api/cart/items', () =>
        HttpResponse.json({ status: 404, message: 'No such product' }, { status: 404 }),
      ),
    )

    await user.click(again)

    expect(await screen.findByText(/Not added: Test Kettle/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/orders/100')
  })
})

describe('an order the server refuses up front', () => {
  const stock = "Insufficient stock for 'Test Kettle': requested 2, available 1"

  it('shows the message by the line, keeps the cart, and offers to lower the quantity', async () => {
    const { cart, user, router } = await openCart({ refuse: { status: 409, message: stock } })

    await placeOrder(user)

    const line = await screen.findByRole('listitem')
    expect(await within(line).findByRole('alert')).toHaveTextContent(stock)
    expect(router.state.location.pathname).toBe('/cart')
    expect(cart.view().items).toHaveLength(1)

    await user.click(within(line).getByRole('button', { name: 'Lower to 1' }))

    await waitFor(() => expect(cart.calls).toContain('PUT 1 x1'))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('offers no lowering when nothing is left', async () => {
    const { user } = await openCart({
      refuse: { status: 409, message: "Insufficient stock for 'Test Kettle': requested 2, available 0" },
    })

    await placeOrder(user)

    const line = await screen.findByRole('listitem')
    expect(await within(line).findByRole('alert')).toHaveTextContent('available 0')
    expect(within(line).queryByRole('button', { name: /Lower to/ })).not.toBeInTheDocument()
  })

  it('shows any other refusal on top and keeps the cart', async () => {
    const { user } = await openCart({ refuse: { status: 409, message: 'Cannot place an order: the cart is empty' } })

    await placeOrder(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot place an order: the cart is empty')
    expect(screen.getByText('Your order was not placed')).toBeInTheDocument()
    expect(screen.getByText('Test Kettle')).toBeInTheDocument()
  })
})

describe('a lost answer', () => {
  it('never asks twice, and shows the order that was made', async () => {
    const { orders, user, router } = await openCart({ drop: 'after' })

    await placeOrder(user)

    expect(await screen.findByRole('heading', { level: 1, name: 'Order #100' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/orders/100')
    expect(orders.calls.filter((call) => call === 'POST /api/orders')).toHaveLength(1)
    expect(orders.calls).toContain('GET /api/orders')
  })

  it('opens the newest order when the account has older ones', async () => {
    const { orders, user, router } = await openCart({ drop: 'after' })
    orders.orders.push(orderFixture({ id: 5 }), orderFixture({ id: 3 }))

    await placeOrder(user)

    await screen.findByRole('heading', { level: 1, name: 'Order #102' })
    expect(router.state.location.pathname).toBe('/orders/102')
  })

  it('shows the error when the re-reading fails too, rather than guessing', async () => {
    const { orders, user, router } = await openCart({ drop: 'after' })
    const down = () => HttpResponse.json({ status: 500, message: 'Down' }, { status: 500 })
    server.use(http.get('/api/orders', down), http.get('/api/cart', down))

    await placeOrder(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server')
    expect(router.state.location.pathname).toBe('/cart')
    expect(orders.calls.filter((call) => call === 'POST /api/orders')).toHaveLength(1)
  })

  it('never asks twice, and keeps the cart when no order was made', async () => {
    const { cart, orders, user, router } = await openCart({ drop: 'before' })

    await placeOrder(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server')
    expect(router.state.location.pathname).toBe('/cart')
    expect(orders.calls.filter((call) => call === 'POST /api/orders')).toHaveLength(1)
    expect(cart.view().items).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
  })
})

describe('the order page', () => {
  it('shows a settled order at once, with no waiting message', async () => {
    server.use(
      http.get('/api/orders/7', () => HttpResponse.json(orderFixture({ id: 7, status: 'CONFIRMED' }))),
      http.get('/api/orders/7/status', () =>
        HttpResponse.json({ orderId: 7, status: 'CONFIRMED', reason: '', changedAt: '2026-10-06T10:00:05Z' }),
      ),
    )
    renderRoute('/orders/7', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText('Your order is confirmed.')).toBeInTheDocument()
    expect(screen.queryByText(/Placing your order/)).not.toBeInTheDocument()
  })

  it('says so for an order that does not exist, and for one that is not a number', async () => {
    server.use(
      http.get('/api/orders/9', () =>
        HttpResponse.json({ status: 404, message: 'Order 9 not found' }, { status: 404 }),
      ),
    )
    renderRoute('/orders/9', { signedInAs: 'CUSTOMER' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Order not found' })).toBeInTheDocument()
  })

  it('says "Not permitted" for another customer’s order', async () => {
    server.use(
      http.get('/api/orders/8', () => HttpResponse.json({ status: 403, message: 'Not your order' }, { status: 403 })),
    )
    renderRoute('/orders/8', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Not permitted' })).toBeInTheDocument()
  })

  it('shows a load error with Retry', async () => {
    server.use(
      http.get('/api/orders/6', () =>
        HttpResponse.json({ status: 500, message: 'Orders are unavailable' }, { status: 500 }),
      ),
    )
    renderRoute('/orders/6', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText('Orders are unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('retries loading the order', async () => {
    let answered = false
    server.use(
      http.get('/api/orders/4', () => {
        if (answered) return HttpResponse.json(orderFixture({ id: 4 }))
        answered = true
        return HttpResponse.json({ status: 500, message: 'Orders are unavailable' }, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/orders/4', { signedInAs: 'CUSTOMER' })

    await user.click(await screen.findByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('region', { name: 'Items in this order' })).toBeInTheDocument()
  })

  it('not-a-number ids are not orders', async () => {
    renderRoute('/orders/abc', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Order not found' })).toBeInTheDocument()
  })

  it('keeps going when one poll fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let asked = 0
    server.use(
      http.get('/api/orders/5', () => HttpResponse.json(orderFixture({ id: 5 }))),
      http.get('/api/orders/5/status', () => {
        asked += 1
        return asked === 1
          ? HttpResponse.json({ status: 503, message: 'Busy' }, { status: 503 })
          : HttpResponse.json({ orderId: 5, status: 'CONFIRMED', reason: '', changedAt: '2026-10-06T10:00:05Z' })
      }),
    )
    renderRoute('/orders/5', { signedInAs: 'CUSTOMER' })
    expect(await screen.findByText('Could not check just now. Trying again.')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(2000))

    expect(await screen.findByText('Your order is confirmed.')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('/checkout is only an old address for the cart', async () => {
    const { router } = renderRoute('/checkout', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Your cart' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/cart')
  })
})
