import { useEffect, useReducer, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { usePageTitle } from '@/app/pageTitle'
import { ApiError } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Button, buttonClass } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { SagaTimeline, type SagaStep } from '@/components/SagaTimeline'
import { StaffNote } from '@/components/StaffNote'
import { orderConfirmedNote } from '@/content/notes'
import { useAddToCart } from '@/features/cart/api'
import { formatPrice } from '@/lib/money'
import { useOrder, useOrderStatus } from './api'
import { GIVE_UP_AFTER_MS, isPolling, nextPhase, SLOW_AFTER_MS, type OrderPhase } from './orderStatus'
import './checkout.css'

/** `/orders/42` is 42; anything else is not an order. */
function parseId(value: string | undefined): number | null {
  return value !== undefined && /^[1-9]\d{0,15}$/.test(value) ? Number(value) : null
}

const when = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const shown = (iso: string | undefined) =>
  iso && !Number.isNaN(Date.parse(iso)) ? when.format(new Date(iso)) : undefined

export function OrderPage() {
  const id = parseId(useParams().id)
  usePageTitle(id === null ? 'Order' : `Order #${id}`)
  const order = useOrder(id)
  const [phase, dispatch] = useReducer(nextPhase, 'pending' as OrderPhase)
  const status = useOrderStatus(id, phase)

  // The server's word moves the machine. The order itself may already be settled (an old order, opened again).
  useEffect(() => {
    if (order.data) dispatch({ type: 'status', status: order.data.status })
  }, [order.data])
  useEffect(() => {
    if (status.data) dispatch({ type: 'status', status: status.data.status })
  }, [status.data])
  // The two clocks start when the page opens; the machine ignores them once the order is settled.
  useEffect(() => {
    const slow = setTimeout(() => dispatch({ type: 'slow' }), SLOW_AFTER_MS)
    const giveUp = setTimeout(() => dispatch({ type: 'giveUp' }), GIVE_UP_AFTER_MS)
    return () => {
      clearTimeout(slow)
      clearTimeout(giveUp)
    }
  }, [id])

  // 403 (another customer's order) and 404 (none) read the same, so the page never confirms that an id exists.
  if (id === null || (order.error instanceof ApiError && (order.error.status === 404 || order.error.status === 403))) {
    return (
      <div className="stack">
        <h1>Order not found</h1>
        <p>There is no such order on your account.</p>
        <Link to="/orders" className={buttonClass({ variant: 'secondary' })}>
          <span>My orders</span>
        </Link>
      </div>
    )
  }
  if (order.isError) {
    return (
      <div className="stack">
        <h1>{`Order #${id}`}</h1>
        <ErrorPanel error={order.error} onRetry={() => void order.refetch()} />
      </div>
    )
  }
  if (order.isPending) {
    return (
      <div className="stack">
        <h1>{`Order #${id}`}</h1>
        <div className="reserve-sm">
          <p role="status">Loading your order…</p>
        </div>
      </div>
    )
  }

  const { items, totalAmount, placedAt } = order.data
  const reason = status.data?.reason || order.data.statusReason || undefined
  const badge = phase === 'confirmed' ? 'CONFIRMED' : phase === 'cancelled' ? 'CANCELLED' : 'PENDING'
  // The API does not say which step failed; a declined payment says so in its words.
  const failedAt: SagaStep = reason?.startsWith('Payment declined') ? 'payment' : 'stock'
  const settledAt = shown(status.data?.changedAt ?? order.data.statusChangedAt)

  return (
    <div className="stack order">
      <h1>{`Order #${id}`}</h1>
      <SagaTimeline
        orderId={id}
        status={badge}
        current="stock"
        failedAt={failedAt}
        reason={reason}
        times={{ placed: shown(placedAt), ...(phase === 'confirmed' && settledAt ? { confirmed: settledAt } : {}) }}
      />
      <Outcome phase={phase} reason={reason} items={items} />
      {isPolling(phase) && status.isError ? (
        <p className="ed-caption" role="status">
          Could not check just now. Trying again.
        </p>
      ) : null}
      <section aria-label="Items in this order">
        <ul className="order-lines">
          {items.map((item) => (
            <li key={item.productId} className="order-line">
              <span className="order-line-name">{item.productName}</span>
              <span className="ed-caption">{`${item.quantity} × ${formatPrice(item.unitPrice)}`}</span>
              <span className="order-line-total">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="order-total">
          <span>Total</span>
          <strong>{formatPrice(totalAmount)}</strong>
        </p>
      </section>
    </div>
  )
}

function Outcome({
  phase,
  reason,
  items,
}: {
  phase: OrderPhase
  reason: string | undefined
  items: { productId: number; productName: string; quantity: number }[]
}) {
  if (phase === 'confirmed') {
    return (
      <>
        <p role="status" className="order-outcome">
          Your order is confirmed.
        </p>
        {orderConfirmedNote ? (
          <StaffNote name={orderConfirmedNote.name} role={orderConfirmedNote.role} date={orderConfirmedNote.date}>
            {orderConfirmedNote.text}
          </StaffNote>
        ) : null}
        <Link to="/" className={buttonClass({ variant: 'secondary' })}>
          <span>Back to the shelf</span>
        </Link>
      </>
    )
  }
  if (phase === 'cancelled') return <Cancelled reason={reason} items={items} />
  if (phase === 'gaveUp') {
    return (
      <Alert tone="info" title="We stopped checking">
        Your order is still being settled. See its result in <Link to="/orders">My orders</Link>.
      </Alert>
    )
  }
  return (
    <p role="status" className="order-outcome">
      {phase === 'slow'
        ? 'Taking longer than usual. We are still checking, you can stay on this page.'
        : 'Placing your order. This usually takes a few seconds.'}
    </p>
  )
}

/** The cart is not restored by the backend (web KI-007): the lines can be added again from the order. */
function Cancelled({
  reason,
  items,
}: {
  reason: string | undefined
  items: { productId: number; productName: string; quantity: number }[]
}) {
  const add = useAddToCart()
  const navigate = useNavigate()
  const [failed, setFailed] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  async function addAgain() {
    setAdding(true)
    const missed: string[] = []
    // One after another: the cart's queue keeps them in order, and the last answer is the whole cart.
    for (const item of items) {
      try {
        await add.mutateAsync({ productId: item.productId, quantity: item.quantity })
      } catch {
        missed.push(item.productName)
      }
    }
    setFailed(missed)
    setAdding(false)
    if (missed.length === 0) void navigate('/cart')
  }

  return (
    <div className="stack">
      <Alert tone="danger" title="Your order was cancelled">
        {reason ?? 'The order could not be completed.'}
      </Alert>
      {failed.length > 0 ? (
        <Alert tone="warning" title="Some items could not be added">
          {`Not added: ${failed.join(', ')}. They may no longer be in the catalogue.`}
        </Alert>
      ) : null}
      <div className="order-actions">
        <Button loading={adding} onClick={() => void addAgain()}>
          Add these items to my cart again
        </Button>
        <Link to="/cart" className={buttonClass({ variant: 'ghost' })}>
          <span>Back to cart</span>
        </Link>
      </div>
    </div>
  )
}
