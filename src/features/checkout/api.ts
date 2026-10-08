import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import { cartKeys } from '@/features/cart/api'
import { fetchCart } from '@/features/cart/cart'
import { fetchOrder, fetchOrders, fetchOrderStatus, placeOrder, type Order } from './orders'
import { isPolling, POLL_MS, type OrderPhase } from './orderStatus'

/** A person's orders. Not under `'catalog'`, so the session drops them when it ends. */
export const orderKeys = {
  all: ['orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
  detail: (id: number) => [...orderKeys.all, 'detail', id] as const,
  status: (id: number) => [...orderKeys.all, 'status', id] as const,
}

/** The order, once. A `201` seeds this entry, so the order page opens with its lines already there. */
export function useOrder(id: number | null) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? 0),
    queryFn: ({ signal }) => fetchOrder(id!, signal),
    enabled: id !== null,
    staleTime: Infinity,
  })
}

/** Asks for the status every `POLL_MS` while `phase` says to; the browser pauses it while the tab is hidden. */
export function useOrderStatus(id: number | null, phase: OrderPhase) {
  return useQuery({
    queryKey: orderKeys.status(id ?? 0),
    queryFn: ({ signal }) => fetchOrderStatus(id!, signal),
    enabled: id !== null,
    refetchInterval: isPolling(phase) ? POLL_MS : false,
    refetchIntervalInBackground: false,
    // Each poll must ask: a fresh entry would otherwise be reused when the page is opened again.
    staleTime: 0,
    // A refused poll is not the order failing: it is tried again at the next tick.
    retry: false,
  })
}

/**
 * Places the order, and never twice. The request is not retried by anything: if the answer is lost (the network
 * failed, status 0) the order may exist, so the cart is read instead. Checkout empties the cart the moment an
 * order is accepted: an empty cart then means the order was made, and the newest order is the one; a cart that
 * still has its lines means nothing was placed, and the error is shown with the cart kept.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<Order> => {
      try {
        return await placeOrder()
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 0) throw error
        const [cart, orders] = await Promise.all([fetchCart().catch(() => null), fetchOrders().catch(() => null)])
        const newest = orders?.reduce<Order | null>((best, order) => (!best || order.id > best.id ? order : best), null)
        if (cart && cart.items.length === 0 && newest) return newest
        throw error
      }
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      // The server emptied the cart: ask it, do not guess.
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
      void queryClient.invalidateQueries({ queryKey: orderKeys.list() })
    },
    // A 503 means the shop shed this checkout (more than 8 at once: nothing written, Retry-After 1) or inventory was slow. The
    // order is never sent again by itself (a POST is never retried, src/api/retry.ts); the cart is re-read so the screen shows
    // what the server really holds: if the order did land, the cart is empty and the shopper finds it in Your orders.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 503)
        void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
  })
}
