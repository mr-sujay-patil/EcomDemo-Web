import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { buttonClass } from '@/components/Button'
import { countGuestItems } from './guestCart'
import { useGuestCart } from './useGuestCart'
import './cart.css'

const items = (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`

/**
 * Under the header, after a customer signs in with a guest cart: while it moves, then what moved and what did not (and why),
 * with Try again for what is still in this browser. Nothing is said when there was nothing to move.
 */
export function GuestCartNotice() {
  const { replay, retry, dismiss } = useGuestCart()
  if (replay.status === 'idle') return null
  if (replay.status === 'running') {
    return (
      <div className="page guest-notice">
        <Alert tone="info">Moving the items you chose before signing in into your cart.</Alert>
      </div>
    )
  }

  const { outcome, names } = replay
  const moved = countGuestItems(outcome.moved)
  const nameOf = (productId: number) => names.get(productId)
  if (outcome.dropped.length === 0 && outcome.kept.length === 0) {
    return (
      <div className="page guest-notice">
        <Alert tone="success" title="Your cart is up to date" onClose={dismiss}>
          <div className="guest-notice-body">
            <span>{`The ${items(moved)} you chose before signing in ${moved === 1 ? 'is' : 'are'} in your cart now.`}</span>
            <Link to="/cart" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              <span>View cart</span>
            </Link>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="page guest-notice">
      <Alert tone="warning" title="Some items did not move to your cart" onClose={dismiss}>
        <div className="guest-notice-body">
          {moved > 0 ? <p>{`${items(moved)} moved to your cart.`}</p> : null}
          <ul>
            {outcome.dropped.map((line) => (
              <li key={`dropped-${line.productId}`}>
                {`${nameOf(line.productId) ?? 'An item'}: no longer in the shop, so it was taken out.`}
              </li>
            ))}
            {outcome.kept.map((line) => (
              <li key={`kept-${line.productId}`}>
                {`${nameOf(line.productId) ?? 'An item'}: not moved yet. It is still saved in this browser.`}
              </li>
            ))}
          </ul>
          {outcome.kept.length > 0 ? (
            <button type="button" className={buttonClass({ variant: 'secondary', size: 'sm' })} onClick={retry}>
              Try again
            </button>
          ) : null}
        </div>
      </Alert>
    </div>
  )
}
