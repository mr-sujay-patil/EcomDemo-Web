import { afterEach, describe, expect, it, vi } from 'vitest'
import { GUEST_CART_KEY } from './guestCart'
import { browserStorage, createGuestCartStore } from './guestCartStore'

/** Another tab's write: storage changes, and this tab hears a `storage` event (a tab never hears its own). */
function otherTabWrites(value: string | null, key: string | null = GUEST_CART_KEY) {
  if (key === null) localStorage.clear()
  else if (value === null) localStorage.removeItem(key)
  else localStorage.setItem(key, value)
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }))
}

/** A storage whose every call throws, like blocked site data. */
const broken = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
} as unknown as Storage

afterEach(() => vi.restoreAllMocks())

describe('the guest cart store', () => {
  it('starts empty, keeps what is added in localStorage, and removes the key when the cart is empty again', () => {
    const store = createGuestCartStore()
    expect(store.getSnapshot()).toEqual([])

    store.add(4)
    store.add(4)
    store.add(9)
    expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '')).toEqual({
      items: [
        { productId: 4, quantity: 2 },
        { productId: 9, quantity: 1 },
      ],
    })

    store.setQuantity(4, 5)
    store.remove(9)
    expect(store.getSnapshot()).toEqual([{ productId: 4, quantity: 5 }])
    store.markSent(4, { over: 1, quantity: 5 })
    store.take(4, 5)
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
  })

  it('survives a reload: a new store reads what the last one wrote', () => {
    createGuestCartStore().add(2)

    expect(createGuestCartStore().getSnapshot()).toEqual([{ productId: 2, quantity: 1 }])
  })

  it('discards corrupt or foreign data under its key, without an error', () => {
    localStorage.setItem(GUEST_CART_KEY, '{"items":[{"productId":"drop table","quantity":1}]}')

    expect(createGuestCartStore().getSnapshot()).toEqual([])
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
  })

  it('never stores a price, a name or a token: only ids and quantities', () => {
    createGuestCartStore().add(2)

    const stored = JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '{}') as { items: object[] }
    expect(Object.keys(stored.items[0] ?? {})).toEqual(['productId', 'quantity'])
  })

  it('follows another tab through the storage event, and tells its listeners only of a real change', () => {
    const store = createGuestCartStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    otherTabWrites('{"items":[{"productId":5,"quantity":3}]}')
    expect(store.getSnapshot()).toEqual([{ productId: 5, quantity: 3 }])
    expect(listener).toHaveBeenCalledTimes(1)

    otherTabWrites('{"items":[{"productId":5,"quantity":3}]}')
    otherTabWrites('{"theme":"dark"}', 'ecomdemo-theme')
    expect(listener).toHaveBeenCalledTimes(1)

    otherTabWrites(null, null)
    expect(store.getSnapshot()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    otherTabWrites('{"items":[{"productId":6,"quantity":1}]}')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stops listening to the window only when the last listener leaves', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const store = createGuestCartStore()
    const first = store.subscribe(() => undefined)
    const second = store.subscribe(() => undefined)

    first()
    expect(remove).not.toHaveBeenCalledWith('storage', expect.any(Function))
    second()
    expect(remove).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('works in memory when there is no storage, or storage refuses every call', () => {
    for (const storage of [null, broken]) {
      const store = createGuestCartStore(storage)
      store.add(3)
      store.add(3)
      expect(store.refresh()).toEqual([{ productId: 3, quantity: 2 }])
      store.remove(3)
      expect(store.getSnapshot()).toEqual([])
    }
  })

  it('ignores a value it can neither read nor remove', () => {
    const stubborn = {
      getItem: () => 'not json',
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage

    expect(createGuestCartStore(stubborn).getSnapshot()).toEqual([])
  })

  it('finds no storage where touching localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(browserStorage()).toBeNull()
  })
})
