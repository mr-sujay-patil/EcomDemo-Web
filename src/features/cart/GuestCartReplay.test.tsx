import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, type RequestHandler } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeCart } from '@/test/msw/cart'
import { server } from '@/test/msw/server'
import { renderRoute, sessionFor } from '@/test/render'
import { GUEST_CART_KEY } from './guestCart'
import { useGuestCart } from './useGuestCart'

function guestCart(items: { productId: number; quantity: number }[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items }))
}

/** Renders `path` signed out with a guest cart and an account cart, then signs in as `role` (as the sign-in form would). */
async function signInWith(
  items: { productId: number; quantity: number }[],
  {
    path = '/cart',
    role = 'CUSTOMER' as const,
    cart = fakeCart(),
    before = [] as RequestHandler[],
  }: { path?: string; role?: 'CUSTOMER' | 'ADMIN'; cart?: ReturnType<typeof fakeCart>; before?: RequestHandler[] } = {},
) {
  guestCart(items)
  // `before` answers first; what it passes on (returns nothing for) reaches the pretend cart server.
  server.use(...before, ...cart.handlers)
  const user = userEvent.setup()
  const rendered = renderRoute(path)
  await screen.findByRole('heading', { level: 1 })
  act(() => {
    rendered.store.start(sessionFor(role))
  })
  return { user, cart, ...rendered }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('moving the guest cart into the account on sign-in', () => {
  it('posts each line, empties the browser, says so, and the cart page shows the server’s lines', async () => {
    const { cart } = await signInWith([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])

    expect(await screen.findByText('Your cart is up to date')).toBeInTheDocument()
    expect(screen.getByText('The 3 items you chose before signing in are in your cart now.')).toBeInTheDocument()
    expect(cart.calls).toEqual(['POST 1 x2', 'POST 3 x1'])
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
    const lines = await screen.findAllByRole('listitem')
    expect(lines).toHaveLength(2)
    expect(within(lines[0]!).getByText('price when added')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument()
  })

  it('says it is moving the cart while it does', async () => {
    const cart = fakeCart()
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => (release = resolve))
    const before = [
      http.post('/api/cart/items', async () => {
        await held
      }),
    ]
    await signInWith([{ productId: 1, quantity: 1 }], { cart, before })

    expect(await screen.findByText('Moving the items you chose before signing in into your cart.')).toBeInTheDocument()
    release()
    // Let the move finish inside this test: it writes to the same storage the next test uses.
    expect(await screen.findByText('Your cart is up to date')).toBeInTheDocument()
  })

  it('adds to a line the account already has, and says one item moved', async () => {
    const cart = fakeCart({ initial: [{ productId: 1, quantity: 2 }] })
    await signInWith([{ productId: 1, quantity: 1 }], { cart })

    expect(await screen.findByText('The 1 item you chose before signing in is in your cart now.')).toBeInTheDocument()
    expect(cart.view().items).toEqual([expect.objectContaining({ productId: 1, quantity: 3 })])
  })

  it('reports a product the shop no longer has (no name: the browser keeps none), and moves the rest', async () => {
    const cart = fakeCart()
    // The report names only what the catalogue cache holds; product 7 is gone, so it has no name.
    await signInWith(
      [
        { productId: 7, quantity: 1 },
        { productId: 1, quantity: 1 },
      ],
      { cart },
    )

    const notice = await screen.findByText('Some items did not move to your cart')
    const alert = notice.closest('[role="status"]') as HTMLElement
    expect(within(alert).getByText('1 item moved to your cart.')).toBeInTheDocument()
    expect(within(alert).getByText('An item: no longer in the shop, so it was taken out.')).toBeInTheDocument()
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(cart.view().items.map((item) => item.productId)).toEqual([1])
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
  })

  it('keeps a line that could not be sent, names it, and Try again sends it', async () => {
    const cart = fakeCart()
    let down = true
    const before = [
      http.post('/api/cart/items', () =>
        down ? HttpResponse.json({ status: 503, message: 'Busy' }, { status: 503 }) : undefined,
      ),
    ]
    const { user } = await signInWith([{ productId: 1, quantity: 2 }], { path: '/products/1', cart, before })

    expect(
      await screen.findByText('Test Kettle: not moved yet. It is still saved in this browser.'),
    ).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '')).toEqual({
      items: [{ productId: 1, quantity: 2, sent: { over: 0, quantity: 2 } }],
    })

    down = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Your cart is up to date')).toBeInTheDocument()
    expect(cart.view().items).toEqual([expect.objectContaining({ productId: 1, quantity: 2 })])
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
  })

  it('names a line from the shelf’s copy of the catalogue when that is what the browser has', async () => {
    const cart = fakeCart({ refuse: { status: 503, message: 'Busy' } })
    await signInWith([{ productId: 3, quantity: 1 }], { path: '/', cart })

    expect(
      await screen.findByText('Test Gift Card: not moved yet. It is still saved in this browser.'),
    ).toBeInTheDocument()
  })

  it('does not post a line again when the first post arrived but its answer was lost (web KI-037)', async () => {
    const cart = fakeCart()
    let lose = true
    const before = [
      http.post('/api/cart/items', async ({ request }) => {
        if (!lose) return undefined
        lose = false
        // The server applies it (through the fake's own handler), but the browser never gets the answer.
        const { productId, quantity } = (await request.clone().json()) as { productId: number; quantity: number }
        await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity }),
        })
        return HttpResponse.error()
      }),
    ]
    const { user } = await signInWith([{ productId: 1, quantity: 2 }], { cart, before })
    await screen.findByText(/not moved yet/)
    expect(cart.view().items).toEqual([expect.objectContaining({ productId: 1, quantity: 2 })])

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Your cart is up to date')).toBeInTheDocument()
    expect(cart.view().items).toEqual([expect.objectContaining({ productId: 1, quantity: 2 })])
    expect(cart.calls).toEqual(['POST 1 x2'])
  })

  it('keeps everything when the browser refuses the replay lock', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: { request: () => Promise.reject(new Error('refused')) },
    })
    const { cart } = await signInWith([{ productId: 1, quantity: 1 }])

    expect(await screen.findByText(/not moved yet/)).toBeInTheDocument()
    expect(cart.calls).toEqual([])
  })

  it('says nothing when another tab already moved the cart', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: (_name: string, task: () => Promise<unknown>) => {
          // The other tab held the lock and sent everything meanwhile.
          localStorage.removeItem(GUEST_CART_KEY)
          return task()
        },
      },
    })
    const { cart } = await signInWith([{ productId: 1, quantity: 1 }], { path: '/about' })

    await waitFor(() => expect(screen.queryByText(/Moving the items/)).not.toBeInTheDocument())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(cart.calls).toEqual([])
  })

  it('lets the report go', async () => {
    const { user } = await signInWith([{ productId: 1, quantity: 1 }], { path: '/about' })
    await screen.findByText('Your cart is up to date')

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText('Your cart is up to date')).not.toBeInTheDocument()
  })

  it('links to the cart from the report', async () => {
    const { user, router } = await signInWith([{ productId: 1, quantity: 1 }], { path: '/about' })

    await user.click(await screen.findByRole('link', { name: 'View cart' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/cart'))
  })

  it('does nothing for an empty guest cart, and nothing at all for an admin, whose guest cart stays', async () => {
    const cart = fakeCart()
    await signInWith([{ productId: 1, quantity: 1 }], { path: '/about', role: 'ADMIN', cart })

    await screen.findByRole('link', { name: 'Admin' })
    expect(cart.calls).toEqual([])
    expect(localStorage.getItem(GUEST_CART_KEY)).not.toBeNull()
  })

  it('stops, and says nothing, when the session ends during the move', async () => {
    const cart = fakeCart()
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => (release = resolve))
    const before = [
      http.post('/api/cart/items', async () => {
        await held
        return HttpResponse.json({ id: 1, items: [], totalAmount: 0 })
      }),
    ]
    const { store } = await signInWith(
      [
        { productId: 1, quantity: 1 },
        { productId: 3, quantity: 1 },
      ],
      { path: '/about', cart, before },
    )
    await screen.findByText(/Moving the items/)

    act(() => {
      store.end('signed-out')
    })
    release()

    await waitFor(() => expect(screen.queryByText(/Moving the items/)).not.toBeInTheDocument())
    expect(screen.queryByText(/Your cart is up to date|did not move/)).not.toBeInTheDocument()
    // The second line was never sent: it is still in the browser for the next sign-in.
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '{}')).toEqual({
        items: [{ productId: 3, quantity: 1 }],
      }),
    )
  })
})

describe('useGuestCart', () => {
  it('says where it must be used when there is no provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useGuestCart())).toThrow('useGuestCart must be used inside <GuestCartProvider>')
  })
})
