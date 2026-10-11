import { useQueries } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { buttonClass } from '@/components/Button'
import { CartLine } from '@/components/CartLine'
import { ErrorPanel } from '@/components/ErrorPanel'
import { productQuery } from '@/features/catalog/api'
import { countGuestItems, type GuestLine } from './guestCart'
import { useGuestCart } from './useGuestCart'
import './cart.css'

const UNDO_MS = 5000

/** Where "Sign in to check out" goes: sign-in, then back here, where the replay has moved the lines into the account. */
export const SIGN_IN_TO_CHECK_OUT = `/sign-in?next=${encodeURIComponent('/cart')}`

type Removed = { productId: number; name: string; quantity: number }

/** What the shelf's stock hint says about a line: nothing, or a sentence (a hint: the order checks stock). */
function stockNote(stock: number, quantity: number): string | null {
  if (stock === 0) return 'Out of stock right now.'
  if (stock < quantity) return `Only ${stock} left.`
  return null
}

/**
 * `/cart` for someone who has not signed in: the guest cart kept in this browser (decisions [Phase 24]). Each line's name,
 * category and current price come from the catalogue by id; the browser keeps no prices and adds nothing up, so there are
 * no totals here. Checking out needs an account: signing in moves these lines into it.
 */
export function GuestCartPage() {
  const { lines, setQuantity, remove, add } = useGuestCart()
  const products = useQueries({ queries: lines.map((line) => productQuery(line.productId)) })
  const [removed, setRemoved] = useState<Removed | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function removeLine(line: Removed) {
    remove(line.productId)
    clearTimeout(timer.current)
    setRemoved(line)
    timer.current = setTimeout(() => setRemoved(null), UNDO_MS)
  }

  function undo(line: Removed) {
    clearTimeout(timer.current)
    add(line.productId, line.quantity)
    setRemoved(null)
  }

  const undoAlert = removed ? (
    <Alert tone="success">
      <div className="cart-undo">
        <span>{`${removed.name} removed.`}</span>
        <button type="button" className={buttonClass({ variant: 'ghost', size: 'sm' })} onClick={() => undo(removed)}>
          Undo
        </button>
      </div>
    </Alert>
  ) : null

  if (lines.length === 0) {
    return (
      <div className="stack">
        <h1>Your cart</h1>
        {undoAlert}
        <div className="cart-empty">
          <p className="ed-title">Your cart is empty</p>
          <p className="ed-caption">Things you add show up here, and stay in this browser until you sign in.</p>
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            <span>Browse the shelf</span>
          </Link>
        </div>
      </div>
    )
  }

  // A product the shop no longer has answers 404: that line says so. Any other failure is the page's error.
  const failed = products.find((query) => query.isError && query.error.status !== 404)
  if (failed?.error) {
    return (
      <div className="stack">
        <h1>Your cart</h1>
        <ErrorPanel
          error={failed.error}
          onRetry={() => products.filter((query) => query.isError).forEach((query) => void query.refetch())}
        />
      </div>
    )
  }
  if (products.some((query) => query.isPending)) {
    return (
      <div className="stack">
        <h1>Your cart</h1>
        <div className="reserve-sm">
          <p role="status">Loading your cart…</p>
        </div>
      </div>
    )
  }

  const count = countGuestItems(lines)
  return (
    <div className="stack">
      <h1>Your cart</h1>
      {undoAlert}
      <div className="cart-layout">
        <ul className="cart-lines" aria-label="Items in your cart">
          {lines.map((line: GuestLine, index) => {
            const product = products[index]?.data
            if (!product) {
              return (
                <li key={line.productId}>
                  <div className="guest-gone">
                    <p>This item is no longer in the shop.</p>
                    <button
                      type="button"
                      className={buttonClass({ variant: 'ghost', size: 'sm' })}
                      onClick={() =>
                        removeLine({ productId: line.productId, name: 'The item', quantity: line.quantity })
                      }
                    >
                      Remove it
                    </button>
                  </div>
                </li>
              )
            }
            const note = stockNote(product.stockQuantity, line.quantity)
            return (
              <li key={line.productId}>
                <CartLine
                  name={product.name}
                  category={product.category}
                  unitPrice={product.price}
                  priceNote="current price"
                  quantity={line.quantity}
                  notice={note ? <p className="ed-caption guest-stock">{note}</p> : null}
                  onQuantity={(quantity) => setQuantity(line.productId, quantity)}
                  onRemove={() =>
                    removeLine({ productId: line.productId, name: product.name, quantity: line.quantity })
                  }
                />
              </li>
            )
          })}
        </ul>
        <div className="cart-summary">
          <section className="ed-panel guest-summary" aria-labelledby="guest-summary-title">
            <h2 id="guest-summary-title" className="guest-summary-title">
              Ready to check out?
            </h2>
            <p>{`${count} ${count === 1 ? 'item' : 'items'}, saved in this browser.`}</p>
            <p className="ed-caption">
              Sign in and they move to your account&apos;s cart. The total is worked out there, and you place the order
              from it.
            </p>
            <Link to={SIGN_IN_TO_CHECK_OUT} className={buttonClass({ block: true })}>
              <span>Sign in to check out</span>
            </Link>
            <p className="ed-caption">
              New here? <Link to="/register">Create an account</Link>, then sign in.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
