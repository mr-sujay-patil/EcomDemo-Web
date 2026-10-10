import { ApiError } from '@/api/errors'
import type { Cart } from './cart'
import type { GuestLine } from './guestCart'
import type { GuestCartStore } from './guestCartStore'

/** What a replay did with each line it looked at. */
export type ReplayOutcome = {
  /** Now in the account's cart, and gone from the browser. */
  moved: GuestLine[]
  /** The server said the line can never be added (the product is gone): gone from the browser too. */
  dropped: GuestLine[]
  /** Not sent, or not answered for a reason that may pass (a lost connection, a busy shop): still in the browser. */
  kept: GuestLine[]
}

/** The Web Lock every tab takes to replay, so two tabs signed in at once cannot both send the same lines. */
export const REPLAY_LOCK = 'ecomdemo-guest-cart-replay'

/**
 * Runs `task` holding the replay lock, so a second tab waits for the first and then finds nothing left to send. Where the
 * browser has no Web Locks (`navigator.locks`) the task runs at once.
 */
export async function withReplayLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = navigator.locks as LockManager | undefined
  if (!locks) return task()
  return locks.request(REPLAY_LOCK, task)
}

/**
 * A 404 (no such product) or a 400 (a line the server will never take) is a definite "no": the line is dropped. Anything
 * else (status 0, a 5xx, a 429, a 401, a timeout) is an unknown outcome: the server may or may not have added the line.
 */
export function isPermanent(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400)
}

const heldIn = (cart: Cart, productId: number) => cart.items.find((item) => item.productId === productId)?.quantity ?? 0

/**
 * Sends the guest cart to the account's cart, one `POST /api/cart/items` per line, in order (decisions [Phase 24]).
 *
 * POST adds to a line, so it is not idempotent, and an answer can be lost after the server applied it. So:
 * - the account's cart is read first (`readCart`), and each answer (the whole cart) keeps that picture current;
 * - before a line is sent, the line records what is sent and what the server held (`markSent`), in storage;
 * - a line already marked by an earlier run whose answer never came is **not sent again** if the server now holds at least
 *   `over + quantity`: that POST was applied (web KI-037). Otherwise it is sent again;
 * - a line leaves the browser only once the server has it (`take`); a definite "no" drops it; the first unknown outcome stops
 *   the run, and that line (marked) and the ones after it stay in the browser for a retry.
 *
 * Storage is read again before each line (another tab may have sent it). `stillSignedIn` is asked before each line: once the
 * session has ended nothing more is sent. If the first read of the cart fails, nothing is sent at all.
 */
export async function replayGuestCart({
  store,
  readCart,
  send,
  stillSignedIn,
}: {
  store: GuestCartStore
  readCart: () => Promise<Cart>
  send: (line: { productId: number; quantity: number }) => Promise<Cart>
  stillSignedIn: () => boolean
}): Promise<ReplayOutcome> {
  const outcome: ReplayOutcome = { moved: [], dropped: [], kept: [] }
  let server: Cart
  try {
    server = await readCart()
  } catch {
    outcome.kept.push(...store.refresh())
    return outcome
  }
  const done = new Set<number>()
  for (;;) {
    const line = store.refresh().find((candidate) => !done.has(candidate.productId))
    if (!line) return outcome
    done.add(line.productId)
    if (!stillSignedIn()) {
      outcome.kept.push(...store.getSnapshot())
      return outcome
    }
    const { productId, sent } = line
    if (sent && heldIn(server, productId) >= sent.over + sent.quantity) {
      // The earlier POST arrived; only its answer was lost. Nothing is sent twice.
      store.take(productId, sent.quantity)
      outcome.moved.push({ productId, quantity: sent.quantity })
      continue
    }
    store.markSent(productId, { over: heldIn(server, productId), quantity: line.quantity })
    try {
      server = await send({ productId, quantity: line.quantity })
      store.take(productId, line.quantity)
      outcome.moved.push({ productId, quantity: line.quantity })
    } catch (error) {
      if (isPermanent(error)) {
        store.remove(productId)
        outcome.dropped.push({ productId, quantity: line.quantity })
        continue
      }
      outcome.kept.push(...store.getSnapshot())
      return outcome
    }
  }
}
