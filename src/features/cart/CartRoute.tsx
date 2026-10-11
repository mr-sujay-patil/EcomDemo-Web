import { Navigate, useLocation } from 'react-router'
import { NotPermittedPage } from '@/features/auth/NotPermittedPage'
import { signInPath } from '@/features/auth/nextPath'
import { useSession } from '@/features/auth/useSession'
import { CartPage } from './CartPage'
import { GuestCartPage } from './GuestCartPage'

/**
 * `/cart` for whoever is looking (decisions [Phase 24]): a customer's cart from the server; a visitor's guest cart from this
 * browser; "Not permitted" for an admin, who has no cart. Someone whose session just ended on them (it expired, or the server
 * refused the token) has a cart on the server, so they go to sign in and back, as on every other page of theirs.
 */
export function CartRoute() {
  const { session, role, endedBy } = useSession()
  const location = useLocation()

  if (session === null) {
    if (endedBy === 'expired' || endedBy === 'rejected') return <Navigate to={signInPath(location)} replace />
    return <GuestCartPage />
  }
  return role === 'CUSTOMER' ? <CartPage /> : <NotPermittedPage />
}
