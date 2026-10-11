import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import type { Cart } from './cart'
import { GUEST_CART_KEY } from './guestCart'
import { createGuestCartStore } from './guestCartStore'
import { isPermanent, REPLAY_LOCK, replayGuestCart, withReplayLock } from './guestReplay'

const failure = (status: number) => new ApiError({ status, message: `HTTP ${status}`, correlationId: null })

/**
 * A pretend account cart: POST adds to the line (as the backend does). `fail` decides per call: a status to refuse with, or
 * `'lost'` for a POST the server applies but whose answer never arrives (the case of web KI-037).
 */
function account(
  initial: Record<number, number> = {},
  fail: (productId: number, call: number) => number | 'lost' | null = () => null,
) {
  const held = new Map(Object.entries(initial).map(([id, quantity]) => [Number(id), quantity]))
  const posts: string[] = []
  const view = (): Cart => ({
    id: 1,
    items: [...held].map(([productId, quantity]) => ({
      productId,
      quantity,
      productName: `P${productId}`,
      unitPrice: 1,
      lineTotal: quantity,
    })),
    totalAmount: 0,
  })
  return {
    held,
    posts,
    readCart: vi.fn(() => Promise.resolve(view())),
    send: vi.fn(({ productId, quantity }: { productId: number; quantity: number }) => {
      posts.push(`${productId}x${quantity}`)
      const outcome = fail(productId, posts.length)
      if (typeof outcome === 'number') return Promise.reject(failure(outcome))
      held.set(productId, (held.get(productId) ?? 0) + quantity)
      if (outcome === 'lost') return Promise.reject(failure(0))
      return Promise.resolve(view())
    }),
  }
}

function guest(lines: { productId: number; quantity: number }[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items: lines }))
  return createGuestCartStore()
}

const signedIn = () => true

afterEach(() => vi.unstubAllGlobals())

describe('replaying the guest cart', () => {
  it('posts every line in order, and the browser holds nothing afterwards', async () => {
    const store = guest([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])
    const server = account()

    const outcome = await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(server.posts).toEqual(['1x2', '3x1'])
    expect(outcome).toEqual({
      moved: [
        { productId: 1, quantity: 2 },
        { productId: 3, quantity: 1 },
      ],
      dropped: [],
      kept: [],
    })
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
  })

  it('adds to a line the account already has (the API’s rule)', async () => {
    const store = guest([{ productId: 1, quantity: 2 }])
    const server = account({ 1: 3 })

    await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(server.held.get(1)).toBe(5)
  })

  it('drops a product the shop no longer has and goes on with the rest', async () => {
    const store = guest([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
      { productId: 3, quantity: 4 },
    ])
    const server = account({}, (id) => (id === 2 ? 404 : null))

    const outcome = await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(outcome.moved.map((line) => line.productId)).toEqual([1, 3])
    expect(outcome.dropped).toEqual([{ productId: 2, quantity: 1 }])
    expect(outcome.kept).toEqual([])
    expect(store.getSnapshot()).toEqual([])
  })

  it('stops at a failure that may pass, keeping that line (marked) and the ones after it', async () => {
    const store = guest([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])
    const server = account({ 2: 1 }, (id) => (id === 2 ? 503 : null))

    const outcome = await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(server.posts).toEqual(['1x1', '2x2'])
    expect(outcome.moved).toEqual([{ productId: 1, quantity: 1 }])
    expect(outcome.kept).toEqual([
      { productId: 2, quantity: 2, sent: { over: 1, quantity: 2 } },
      { productId: 3, quantity: 1 },
    ])
    expect(store.getSnapshot()).toEqual(outcome.kept)
  })

  it('does not double a line the server applied when only its answer was lost (web KI-037)', async () => {
    const store = guest([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])
    // The account already had one of product 1. The first POST lands, its answer is lost.
    const server = account({ 1: 1 }, (_id, call) => (call === 1 ? 'lost' : null))

    const first = await replayGuestCart({ store, ...server, stillSignedIn: signedIn })
    expect(first.kept[0]).toEqual({ productId: 1, quantity: 2, sent: { over: 1, quantity: 2 } })
    expect(server.held.get(1)).toBe(3)

    // Try again (or a reload and the next sign-in: the mark is in storage).
    const second = await replayGuestCart({ store: createGuestCartStore(), ...server, stillSignedIn: signedIn })

    expect(server.posts).toEqual(['1x2', '3x1'])
    expect(server.held.get(1)).toBe(3)
    expect(second.moved).toEqual([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ])
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
  })

  it('sends a marked line again when the earlier send did not arrive', async () => {
    const store = guest([{ productId: 1, quantity: 2 }])
    const server = account({}, (_id, call) => (call === 1 ? 0 : null))

    await replayGuestCart({ store, ...server, stillSignedIn: signedIn })
    expect(server.held.get(1)).toBeUndefined()
    const again = await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(server.posts).toEqual(['1x2', '1x2'])
    expect(server.held.get(1)).toBe(2)
    expect(again.moved).toEqual([{ productId: 1, quantity: 2 }])
  })

  it('sends nothing when the account’s cart cannot be read first', async () => {
    const store = guest([{ productId: 1, quantity: 2 }])
    const server = account()
    server.readCart.mockRejectedValueOnce(failure(0))

    const outcome = await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(server.send).not.toHaveBeenCalled()
    expect(outcome.kept).toEqual([{ productId: 1, quantity: 2 }])
  })

  it('sends nothing more once the session has ended', async () => {
    const store = guest([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
    ])
    const server = account()
    let signedInNow = true
    server.send.mockImplementationOnce(() => {
      signedInNow = false
      return Promise.resolve({ id: 1, items: [], totalAmount: 0 })
    })

    const outcome = await replayGuestCart({ store, ...server, stillSignedIn: () => signedInNow })

    expect(server.send).toHaveBeenCalledTimes(1)
    expect(outcome.kept).toEqual([{ productId: 2, quantity: 1 }])
  })

  it('skips a line another tab sent while this one was busy', async () => {
    const store = guest([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
    ])
    const server = account()
    server.send.mockImplementationOnce(() => {
      // The other tab took line 2 meanwhile.
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items: [{ productId: 1, quantity: 1 }] }))
      return Promise.resolve({ id: 1, items: [], totalAmount: 0 })
    })

    await replayGuestCart({ store, ...server, stillSignedIn: signedIn })

    expect(server.send).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toEqual([])
  })
})

describe('the kinds of failure', () => {
  it('treats only 404 and 400 as permanent', () => {
    expect([404, 400].map((status) => isPermanent(failure(status)))).toEqual([true, true])
    expect([0, 401, 429, 500, 503].map((status) => isPermanent(failure(status)))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ])
    expect(isPermanent(new Error('boom'))).toBe(false)
  })
})

describe('the replay lock', () => {
  it('runs the task at once without Web Locks', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })

    await expect(withReplayLock(() => Promise.resolve('ran'))).resolves.toBe('ran')
  })

  it('holds the named Web Lock while the task runs', async () => {
    const request = vi.fn((_name: string, task: () => Promise<string>) => task())
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })

    await expect(withReplayLock(() => Promise.resolve('ran'))).resolves.toBe('ran')
    expect(request).toHaveBeenCalledWith(REPLAY_LOCK, expect.any(Function))
  })
})
