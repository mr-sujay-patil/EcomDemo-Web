import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/useSession'
import { addCartItem, fetchCart, removeCartItem, setCartItemQuantity, type Cart } from './cart'

/**
 * The cart's cache key. It must NOT start with `'catalog'`: the session drops every key that does not,
 * so signing out also clears the cart (a person's data, not the shop's).
 */
export const cartKeys = { all: ['cart'] as const }

export const cartQuery = () => queryOptions({ queryKey: cartKeys.all, queryFn: ({ signal }) => fetchCart(signal) })

/** The cart of whoever is signed in as a CUSTOMER; nothing is requested for anyone else (an admin would get a 403). */
export function useCart() {
  const { role } = useSession()
  return useQuery({ ...cartQuery(), enabled: role === 'CUSTOMER' })
}

/** How many things are in the cart: the sum of the lines' quantities (a count, not money). */
export function countItems(cart: Cart | undefined): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

/** The quantity of one product in the cart, 0 when it is not there. */
export function quantityInCart(cart: Cart | undefined, productId: number): number {
  return cart?.items.find((item) => item.productId === productId)?.quantity ?? 0
}

// One queue for every cart write: the server applies them in the order they were sent, and the answer
// of the last one is the one left in the cache. Two quick clicks on a stepper cannot overtake each other.
const SCOPE = { id: 'cart' }

/**
 * The write's answer is the new cart: it replaces the cached one (`setQueryData`), it is never merged
 * into it. Invalidating would cost a second request for data the answer already holds.
 */
function useStoreAnswer() {
  const queryClient = useQueryClient()
  return (cart: Cart) => queryClient.setQueryData(cartKeys.all, cart)
}

export function useAddToCart() {
  const store = useStoreAnswer()
  return useMutation({
    scope: SCOPE,
    mutationFn: ({ productId, quantity = 1 }: { productId: number; quantity?: number }) =>
      addCartItem(productId, quantity),
    onSuccess: store,
  })
}

/**
 * Changes a line's quantity. The stepper moves at once: the cached line gets the new quantity before the
 * request goes out. Its `lineTotal` and the cart's `totalAmount` stay as they were (the server is the only
 * one who multiplies and adds) until the answer replaces the whole cart. If the server refuses, the cart
 * goes back to exactly what it was and the caller shows `error`.
 */
export function useSetQuantity() {
  const queryClient = useQueryClient()
  const store = useStoreAnswer()
  return useMutation({
    scope: SCOPE,
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      setCartItemQuantity(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all })
      const previous = queryClient.getQueryData<Cart>(cartKeys.all)
      if (previous) {
        queryClient.setQueryData<Cart>(cartKeys.all, {
          ...previous,
          items: previous.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
        })
      }
      return { previous }
    },
    onSuccess: store,
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.all, context.previous)
      // Another write may have been refused for the same reason: ask the server what it holds.
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
  })
}

export function useRemoveItem() {
  const store = useStoreAnswer()
  return useMutation({ scope: SCOPE, mutationFn: (productId: number) => removeCartItem(productId), onSuccess: store })
}
