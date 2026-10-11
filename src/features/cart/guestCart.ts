/**
 * The guest cart: what someone who has not signed in has chosen, kept in this browser until they sign in and it is
 * replayed into their account's cart (decisions [Phase 24]). Only a product id and a quantity per line: never a price, a
 * name or a total (those are the server's), and never anything about a session.
 *
 * Plain functions over an array of lines; `guestCartStore.ts` keeps them in `localStorage`.
 */

/**
 * `sent` is set only while a replay's `POST /api/cart/items` for this line has an unknown outcome (the answer never came):
 * `quantity` of it was sent when the account's cart held `over` of the product. Before the line is sent again the server
 * cart is read: if it holds `over + quantity` or more, the POST was applied and is not repeated (web KI-037).
 */
export type SentMarker = { over: number; quantity: number }

export type GuestLine = { productId: number; quantity: number; sent?: SentMarker }

/** The storage key. A new format gets a new key (`-v2`), so an old value is never read as a new one. */
export const GUEST_CART_KEY = 'ecomdemo-guest-cart-v1'

/** At most this many different products: a guard against a runaway value, far above a real cart. */
export const MAX_LINES = 50

/** At most this many of one product: the quantity stepper's limit. */
export const MAX_QUANTITY = 99

const isQuantity = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_QUANTITY

function isMarker(value: unknown): value is SentMarker {
  if (typeof value !== 'object' || value === null) return false
  const { over, quantity } = value as Record<string, unknown>
  return Number.isSafeInteger(over) && (over as number) >= 0 && isQuantity(quantity)
}

function isLine(value: unknown): value is GuestLine {
  if (typeof value !== 'object' || value === null) return false
  const { productId, quantity, sent } = value as Record<string, unknown>
  return (
    Number.isSafeInteger(productId) &&
    (productId as number) > 0 &&
    isQuantity(quantity) &&
    (sent === undefined || isMarker(sent))
  )
}

/**
 * Reads what storage holds. `null` (nothing stored) is an empty cart; anything this app would not have written (not JSON,
 * another shape, one bad line, a product twice, too many lines) is `undefined`: the caller discards it. Storage is input,
 * like a request body: an extension, another version of the app or a person in devtools may have written it.
 */
export function parseGuestCart(raw: string | null): GuestLine[] | undefined {
  if (raw === null) return []
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null || !('items' in value)) return undefined
  const { items } = value
  if (!Array.isArray(items) || items.length > MAX_LINES || !items.every(isLine)) return undefined
  const ids = new Set(items.map((item) => item.productId))
  if (ids.size !== items.length) return undefined
  // Only the known fields are kept: nothing else that was stored travels any further.
  return items.map(({ productId, quantity, sent }) =>
    sent ? { productId, quantity, sent: { over: sent.over, quantity: sent.quantity } } : { productId, quantity },
  )
}

export function serializeGuestCart(lines: readonly GuestLine[]): string {
  return JSON.stringify({ items: lines })
}

const clamp = (quantity: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(quantity)))

/** One more of a product (or `quantity` more), up to `MAX_QUANTITY`; a new product goes last. A full cart takes no new product. */
export function addLine(lines: readonly GuestLine[], productId: number, quantity = 1): GuestLine[] {
  const existing = lines.find((line) => line.productId === productId)
  if (existing) {
    return lines.map((line) =>
      line.productId === productId ? { ...line, quantity: clamp(line.quantity + quantity) } : line,
    )
  }
  if (lines.length >= MAX_LINES) return [...lines]
  return [...lines, { productId, quantity: clamp(quantity) }]
}

/** Sets a line's quantity (1 to `MAX_QUANTITY`); a product that is not there is left out. */
export function setLineQuantity(lines: readonly GuestLine[], productId: number, quantity: number): GuestLine[] {
  return lines.map((line) => (line.productId === productId ? { ...line, quantity: clamp(quantity) } : line))
}

/** Records that `quantity` of a line is being sent while the account's cart holds `over` of it (see `SentMarker`). */
export function markSent(lines: readonly GuestLine[], productId: number, sent: SentMarker): GuestLine[] {
  return lines.map((line) => (line.productId === productId ? { ...line, sent } : line))
}

export function removeLine(lines: readonly GuestLine[], productId: number): GuestLine[] {
  return lines.filter((line) => line.productId !== productId)
}

/**
 * Takes `quantity` of a product out (what the server just accepted): the line goes when nothing is left. If another tab
 * added more meanwhile, that extra stays for the next replay instead of being lost, and was never sent (no marker).
 */
export function takeLine(lines: readonly GuestLine[], productId: number, quantity: number): GuestLine[] {
  return lines.flatMap((line) => {
    if (line.productId !== productId) return [line]
    const left = line.quantity - quantity
    return left > 0 ? [{ productId, quantity: left }] : []
  })
}

/** How many things: the sum of the quantities (a count, not money). */
export function countGuestItems(lines: readonly GuestLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}

export function guestQuantity(lines: readonly GuestLine[], productId: number): number {
  return lines.find((line) => line.productId === productId)?.quantity ?? 0
}
