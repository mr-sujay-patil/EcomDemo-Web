import {
  addLine,
  GUEST_CART_KEY,
  markSent,
  parseGuestCart,
  removeLine,
  serializeGuestCart,
  setLineQuantity,
  takeLine,
  type GuestLine,
  type SentMarker,
} from './guestCart'

/** `localStorage`, or null where touching it throws (blocked site data, some private modes). */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * The guest cart as a small external store (React reads it with `useSyncExternalStore`), kept in `storage` under
 * `GUEST_CART_KEY`. Every read is validated: a value this app would not have written is removed. When storage cannot be
 * read or written the cart lives in memory for the life of the page (decisions [Phase 24]). Another tab's change arrives
 * through the `storage` event and is read (and validated) again.
 */
export function createGuestCartStore(storage: Storage | null = browserStorage()) {
  const listeners = new Set<() => void>()
  /** What storage holds; `fallback` (what is in memory) when storage cannot be read at all. */
  function read(fallback: GuestLine[]): GuestLine[] {
    if (storage === null) return fallback
    let raw: string | null
    try {
      raw = storage.getItem(GUEST_CART_KEY)
    } catch {
      return fallback
    }
    const parsed = parseGuestCart(raw)
    if (parsed !== undefined) return parsed
    try {
      storage.removeItem(GUEST_CART_KEY)
    } catch {
      // Could not remove it either: it is ignored all the same.
    }
    return []
  }

  let lines: GuestLine[] = read([])

  function write(next: GuestLine[]) {
    lines = next
    try {
      if (next.length === 0) storage?.removeItem(GUEST_CART_KEY)
      else storage?.setItem(GUEST_CART_KEY, serializeGuestCart(next))
    } catch {
      // A full quota or blocked storage: the cart stays in memory for this page.
    }
    notify()
  }

  function notify() {
    listeners.forEach((listener) => {
      listener()
    })
  }

  /** Reads storage again (another tab may have changed it); listeners hear only of a real change. */
  function refresh(): GuestLine[] {
    const next = read(lines)
    if (serializeGuestCart(next) !== serializeGuestCart(lines)) {
      lines = next
      notify()
    }
    return lines
  }

  function onStorage(event: StorageEvent) {
    // `key` is null when another tab cleared the whole of storage.
    if (event.key === GUEST_CART_KEY || event.key === null) refresh()
  }

  return {
    /** The lines; the same array until something changes. */
    getSnapshot: () => lines,
    subscribe: (listener: () => void) => {
      if (listeners.size === 0) window.addEventListener('storage', onStorage)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    },
    refresh,
    add: (productId: number, quantity = 1) => {
      write(addLine(refresh(), productId, quantity))
    },
    setQuantity: (productId: number, quantity: number) => {
      write(setLineQuantity(refresh(), productId, quantity))
    },
    remove: (productId: number) => {
      write(removeLine(refresh(), productId))
    },
    /** Notes, before a replay sends a line, what is being sent and what the server held (see `SentMarker`). */
    markSent: (productId: number, sent: SentMarker) => {
      write(markSent(refresh(), productId, sent))
    },
    /** Takes out what the server accepted during a replay (see `takeLine`). */
    take: (productId: number, quantity: number) => {
      write(takeLine(refresh(), productId, quantity))
    },
  }
}

export type GuestCartStore = ReturnType<typeof createGuestCartStore>
