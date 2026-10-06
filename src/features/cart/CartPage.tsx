import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert } from '@/components/Alert'
import { buttonClass } from '@/components/Button'
import { CartLine } from '@/components/CartLine'
import { ErrorPanel } from '@/components/ErrorPanel'
import { OrderSummary } from '@/components/OrderSummary'
import { countItems, useAddToCart, useCart, useRemoveItem, useSetQuantity } from './api'
import './cart.css'

const UNDO_MS = 5000

type Removed = { productId: number; name: string; quantity: number }

export function CartPage() {
  const navigate = useNavigate()
  const cart = useCart()
  const setQuantity = useSetQuantity()
  const remove = useRemoveItem()
  const add = useAddToCart()
  const [removed, setRemoved] = useState<Removed | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function removeLine(line: Removed) {
    remove.mutate(line.productId, {
      onSuccess: () => {
        clearTimeout(timer.current)
        setRemoved(line)
        timer.current = setTimeout(() => setRemoved(null), UNDO_MS)
      },
    })
  }

  function undo(line: Removed) {
    clearTimeout(timer.current)
    add.mutate({ productId: line.productId, quantity: line.quantity })
    setRemoved(null)
  }

  if (cart.isError) {
    return (
      <div className="stack">
        <h1>Your cart</h1>
        <ErrorPanel error={cart.error} onRetry={() => void cart.refetch()} />
      </div>
    )
  }
  if (cart.isPending) {
    return (
      <div className="stack">
        <h1>Your cart</h1>
        <div className="reserve-sm">
          <p role="status">Loading your cart…</p>
        </div>
      </div>
    )
  }

  const { items, totalAmount } = cart.data
  const failure = setQuantity.error ?? remove.error ?? add.error
  return (
    <div className="stack">
      <h1>Your cart</h1>
      {failure ? (
        <Alert
          tone="danger"
          title="Your cart was not changed"
          onClose={() => {
            setQuantity.reset()
            remove.reset()
            add.reset()
          }}
        >
          {failure.message}
        </Alert>
      ) : null}
      {removed ? (
        <Alert tone="success">
          <div className="cart-undo">
            <span>{`${removed.name} removed.`}</span>
            <button
              type="button"
              className={buttonClass({ variant: 'ghost', size: 'sm' })}
              onClick={() => undo(removed)}
            >
              Undo
            </button>
          </div>
        </Alert>
      ) : null}
      {items.length === 0 ? (
        <div className="cart-empty">
          <p className="ed-title">Your cart is empty</p>
          <p className="ed-caption">Things you add show up here.</p>
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            <span>Browse the shelf</span>
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <ul className="cart-lines" aria-label="Items in your cart">
            {items.map((item) => (
              <li key={item.productId}>
                <CartLine
                  name={item.productName}
                  unitPrice={item.unitPrice}
                  priceNote="price when added"
                  lineTotal={item.lineTotal}
                  quantity={item.quantity}
                  onQuantity={(quantity) => setQuantity.mutate({ productId: item.productId, quantity })}
                  onRemove={() =>
                    removeLine({ productId: item.productId, name: item.productName, quantity: item.quantity })
                  }
                />
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <OrderSummary
              total={totalAmount}
              itemCount={countItems(cart.data)}
              cta="Checkout"
              onCheckout={() => void navigate('/checkout')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
