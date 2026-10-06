import type { OrderStatus } from '@/components/StatusBadge'

/**
 * Where an order is, as the person sees it. A `201` from the server is "received", not "confirmed": the order
 * is settled afterwards (stock, then payment), so the screen walks through these, and only `confirmed` thanks anyone.
 *
 *   placing ─accepted→ pending ─(15 s)→ slow ─(90 s)→ gaveUp
 *                         └──────┬─────────┴────────────┘
 *                     CONFIRMED  │  CANCELLED
 *                         ↓             ↓
 *                     confirmed     cancelled      (both final)
 *
 * `placing` is the Place order button while its request is on the way (the cart page); the order page starts at
 * `pending`. `gaveUp` is the tracking that stopped, not an outcome: the order is still being settled by the
 * server, so a late answer still moves it to `confirmed` or `cancelled`.
 */
export type OrderPhase = 'placing' | 'pending' | 'slow' | 'confirmed' | 'cancelled' | 'gaveUp'

export type OrderEvent =
  { type: 'accepted' } | { type: 'status'; status: OrderStatus } | { type: 'slow' } | { type: 'giveUp' }

/** Never faster than every 1 to 2 seconds (the gateway rate-limits, and the saga takes seconds anyway). */
export const POLL_MS = 1500
/** After this long still PENDING, the screen admits it is taking longer than usual and keeps checking. */
export const SLOW_AFTER_MS = 15_000
/** After this long, checking stops and the person is pointed at their orders. The server's own deadline settles it. */
export const GIVE_UP_AFTER_MS = 90_000

export function nextPhase(phase: OrderPhase, event: OrderEvent): OrderPhase {
  if (phase === 'confirmed' || phase === 'cancelled') return phase
  switch (event.type) {
    case 'accepted':
      return phase === 'placing' ? 'pending' : phase
    case 'status':
      if (event.status === 'CONFIRMED') return 'confirmed'
      if (event.status === 'CANCELLED') return 'cancelled'
      return phase
    case 'slow':
      return phase === 'pending' ? 'slow' : phase
    case 'giveUp':
      return phase === 'pending' || phase === 'slow' ? 'gaveUp' : phase
  }
}

/** Whether the order screen should still be asking the server. */
export function isPolling(phase: OrderPhase): boolean {
  return phase === 'pending' || phase === 'slow'
}
