import type { ReactNode } from 'react'
import { formatPrice } from '@/lib/money'
import { cx } from '../cx'
import { Button } from '../Button'
import './OrderSummary.css'

export type OrderSummaryProps = {
  /** The server's total (`totalAmount`). The summary adds nothing up itself. */
  total: number
  /** Shown only when the server sends it. */
  subtotal?: number
  shipping?: number
  discount?: number
  itemCount?: number
  loading?: boolean
  /** The button's words, default "Place order". */
  cta?: string
  onCheckout?: () => void
}

/** "Subtotal", with the item count when there is one: "Subtotal (1 item)", "Subtotal (3 items)". */
function subtotalLabel(itemCount: number | undefined): string {
  if (!itemCount) return 'Subtotal'
  const items = itemCount > 1 ? 'items' : 'item'
  return `Subtotal (${itemCount} ${items})`
}

function Row({ label, children, tone }: Readonly<{ label: string; children: ReactNode; tone?: 'free' | 'total' }>) {
  return (
    <div className={cx('ed-sum-row', tone === 'free' && 'is-free', tone === 'total' && 'is-total')}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** A receipt: the lines, then a dashed rule, then the total. */
export function OrderSummary({
  total,
  subtotal,
  shipping,
  discount,
  itemCount,
  loading,
  cta = 'Place order',
  onCheckout,
}: Readonly<OrderSummaryProps>) {
  return (
    <section className="ed-panel ed-summary" aria-label="Order summary">
      <h3 className="ed-summary-title">Order summary</h3>
      <dl>
        {subtotal === undefined ? null : <Row label={subtotalLabel(itemCount)}>{formatPrice(subtotal)}</Row>}
        {shipping === undefined ? null : (
          <Row label="Shipping" tone={shipping ? undefined : 'free'}>
            {shipping ? formatPrice(shipping) : 'Free'}
          </Row>
        )}
        {discount ? (
          <Row label="Discount" tone="free">
            {`− ${formatPrice(discount)}`}
          </Row>
        ) : null}
        <Row label="Total" tone="total">
          {formatPrice(total)}
        </Row>
      </dl>
      <Button block iconRight="chevron-right" loading={loading} onClick={onCheckout}>
        {cta}
      </Button>
      <p className="ed-caption ed-summary-note">
        We reserve your items and take payment as soon as you place the order. It usually takes a few seconds.
      </p>
    </section>
  )
}
