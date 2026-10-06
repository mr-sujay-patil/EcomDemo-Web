import { useLocation, useNavigate } from 'react-router'
import { signInPath } from '@/features/auth/nextPath'
import { useSession } from '@/features/auth/useSession'
import { quantityInCart, useAddToCart, useCart } from './api'

/**
 * "Add to cart" for a shelf or a product page. Signed out, it sends the person to sign in and back to
 * this page (nothing is added for them: they choose again). An admin has no cart, so `canAdd` is false.
 */
export function useAddAction() {
  const { role } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const cart = useCart()
  const add = useAddToCart()

  return {
    canAdd: role !== 'ADMIN',
    inCart: (productId: number) => quantityInCart(cart.data, productId),
    /** Why the last add failed (an `ApiError`), until the next try. */
    error: add.error,
    adding: add.isPending ? add.variables.productId : null,
    dismiss: add.reset,
    add: (productId: number) => {
      if (role === null) void navigate(signInPath(location))
      else add.mutate({ productId })
    },
  }
}
