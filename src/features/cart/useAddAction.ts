import { useSession } from '@/features/auth/useSession'
import { quantityInCart, useAddToCart, useCart } from './api'
import { guestQuantity } from './guestCart'
import { useGuestCart } from './useGuestCart'

/**
 * "Add to cart" for a shelf, a product page or the search results. Signed in as a customer it writes to the account's cart;
 * signed out it adds to the guest cart in this browser, which moves to the account when they sign in (decisions [Phase 24]).
 * An admin has no cart, so `canAdd` is false.
 */
export function useAddAction() {
  const { role } = useSession()
  const cart = useCart()
  const add = useAddToCart()
  const guest = useGuestCart()

  return {
    canAdd: role !== 'ADMIN',
    inCart: (productId: number) =>
      role === null ? guestQuantity(guest.lines, productId) : quantityInCart(cart.data, productId),
    /** Why the last add failed (an `ApiError`), until the next try. A guest add cannot fail. */
    error: add.error,
    adding: add.isPending ? add.variables.productId : null,
    dismiss: add.reset,
    add: (productId: number) => {
      if (role === null) guest.add(productId)
      else add.mutate({ productId })
    },
  }
}
