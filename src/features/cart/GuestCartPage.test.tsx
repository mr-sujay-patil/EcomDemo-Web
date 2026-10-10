import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { GUEST_CART_KEY } from './guestCart'

function guestCart(items: { productId: number; quantity: number }[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items }))
}

const stored = () => JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '{"items":[]}') as { items: unknown[] }

async function openGuestCart() {
  const user = userEvent.setup()
  const rendered = renderRoute('/cart')
  await screen.findByRole('heading', { level: 1, name: 'Your cart' })
  await waitFor(() => expect(screen.queryByText('Loading your cart…')).not.toBeInTheDocument())
  return { user, ...rendered }
}

describe('the guest cart page', () => {
  afterEach(() => vi.useRealTimers())

  it('says the cart is empty, and that it stays in this browser', async () => {
    await openGuestCart()

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByText(/stay in this browser until you sign in/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the shelf' })).toHaveAttribute('href', '/')
  })

  it('shows a loading message, then each line with the catalogue’s current price and no totals', async () => {
    guestCart([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])
    renderRoute('/cart')

    expect(await screen.findByText('Loading your cart…')).toBeInTheDocument()
    const lines = await screen.findAllByRole('listitem')
    expect(lines).toHaveLength(2)
    expect(within(lines[0]!).getByText('Test Kettle')).toBeInTheDocument()
    expect(within(lines[0]!).getByText('₹1,299.00 each')).toBeInTheDocument()
    expect(within(lines[0]!).getByText('current price')).toBeInTheDocument()
    expect(within(lines[0]!).getByRole('status')).toHaveTextContent('2')
    // Nothing is added up in the browser: no line total (₹2,598.00) and no cart total.
    expect(screen.queryByText('₹2,598.00')).not.toBeInTheDocument()
    expect(screen.queryByText('₹3,098.00')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Order summary' })).not.toBeInTheDocument()
  })

  it('offers sign-in to check out, and back to the cart', async () => {
    guestCart([{ productId: 1, quantity: 1 }])
    const { user, router } = await openGuestCart()

    const summary = screen.getByRole('region', { name: 'Ready to check out?' })
    expect(within(summary).getByText('1 item, saved in this browser.')).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')

    await user.click(within(summary).getByRole('link', { name: 'Sign in to check out' }))

    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    expect(router.state.location.search).toBe('?next=%2Fcart')
  })

  it('counts the items in the summary and the header', async () => {
    guestCart([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])
    await openGuestCart()

    expect(screen.getByText('3 items, saved in this browser.')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument()
  })

  it('changes a quantity in the browser only', async () => {
    guestCart([{ productId: 1, quantity: 1 }])
    const { user } = await openGuestCart()

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    expect(screen.getByRole('group', { name: 'Quantity of Test Kettle' })).toHaveTextContent('2')
    expect(stored().items).toEqual([{ productId: 1, quantity: 2 }])
  })

  it('says when stock is low or gone (a hint: the order checks it)', async () => {
    server.use(
      http.get('/api/products/3', () =>
        HttpResponse.json({
          id: 3,
          name: 'Test Gift Card',
          description: '',
          price: 500,
          stockQuantity: 0,
          category: null,
          imageUrl: null,
        }),
      ),
    )
    guestCart([
      { productId: 2, quantity: 3 },
      { productId: 3, quantity: 1 },
      { productId: 1, quantity: 1 },
    ])
    await openGuestCart()

    const [sofa, card, kettle] = screen.getAllByRole('listitem')
    expect(within(sofa!).getByText('Only 1 left.')).toBeInTheDocument()
    expect(within(card!).getByText('Out of stock right now.')).toBeInTheDocument()
    expect(within(kettle!).queryByText(/left|Out of stock/)).not.toBeInTheDocument()
  })

  it('says when a product is no longer in the shop, and lets it go', async () => {
    guestCart([
      { productId: 7, quantity: 1 },
      { productId: 1, quantity: 1 },
    ])
    const { user } = await openGuestCart()

    const gone = screen.getAllByRole('listitem')[0]!
    expect(within(gone).getByText('This item is no longer in the shop.')).toBeInTheDocument()
    await user.click(within(gone).getByRole('button', { name: 'Remove it' }))

    expect(screen.getByText('The item removed.')).toBeInTheDocument()
    expect(stored().items).toEqual([{ productId: 1, quantity: 1 }])
  })

  it('removes a line, and Undo puts it back with its quantity', async () => {
    guestCart([{ productId: 1, quantity: 3 }])
    const { user } = await openGuestCart()

    await user.click(screen.getByRole('button', { name: 'Remove Test Kettle' }))
    expect(screen.getByText('Test Kettle removed.')).toBeInTheDocument()
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(await screen.findByText('Test Kettle')).toBeInTheDocument()
    expect(stored().items).toEqual([{ productId: 1, quantity: 3 }])
    expect(screen.queryByText('Test Kettle removed.')).not.toBeInTheDocument()
  })

  it('takes the Undo away after five seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    guestCart([
      { productId: 1, quantity: 1 },
      { productId: 3, quantity: 1 },
    ])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    renderRoute('/cart')
    await screen.findByText('Test Kettle')

    await user.click(screen.getByRole('button', { name: 'Remove Test Kettle' }))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('shows an error with Retry when the catalogue cannot be reached, then the lines', async () => {
    let fail = true
    server.use(
      http.get('/api/products/1', () =>
        fail
          ? HttpResponse.json(
              { status: 500, message: 'The catalogue is unavailable right now.' },
              { status: 500, headers: { 'X-Correlation-Id': 'guest-ref' } },
            )
          : HttpResponse.json({
              id: 1,
              name: 'Test Kettle',
              description: '',
              price: 1299,
              stockQuantity: 5,
              category: 'Kitchen',
              imageUrl: null,
            }),
      ),
    )
    guestCart([{ productId: 1, quantity: 1 }])
    const { user } = await openGuestCart()

    expect(await screen.findByText('The catalogue is unavailable right now.')).toBeInTheDocument()
    expect(screen.getByText(/guest-ref/)).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Test Kettle')).toBeInTheDocument()
  })

  it('follows a change made in another tab', async () => {
    guestCart([{ productId: 1, quantity: 1 }])
    await openGuestCart()

    act(() => {
      guestCart([
        { productId: 1, quantity: 4 },
        { productId: 3, quantity: 1 },
      ])
      window.dispatchEvent(new StorageEvent('storage', { key: GUEST_CART_KEY }))
    })

    expect(await screen.findByText('Test Gift Card')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Quantity of Test Kettle' })).toHaveTextContent('4')
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Cart, 5 items' })).toBeInTheDocument()
  })
})

describe('who sees which cart at /cart', () => {
  it('sends someone whose session was refused to sign in, not to an empty guest cart', async () => {
    const { store, router } = renderRoute('/cart', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'Your cart' })

    act(() => {
      store.reject('test-token')
    })

    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    expect(router.state.location.search).toBe('?next=%2Fcart')
  })

  it('shows the guest cart after a deliberate sign-out', async () => {
    const { store } = renderRoute('/cart', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'Your cart' })

    act(() => {
      store.end('signed-out')
    })

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Sign in' })).not.toBeInTheDocument()
  })
})
