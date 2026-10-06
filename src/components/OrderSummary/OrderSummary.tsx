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

function Row({ label, children, tone }: { label: string; children: ReactNode; tone?: 'free' | 'total' }) {
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
}: OrderSummaryProps) {
  return (
    <section className="ed-panel ed-summary" aria-label="Order summary">
      <h3 className="ed-summary-title">Order summary</h3>
      <dl>
        {subtotal === undefined ? null : (
          <Row label={`Subtotal${itemCount ? ` (${itemCount} item${itemCount > 1 ? 's' : ''})` : ''}`}>
            {formatPrice(subtotal)}
          </Row>
        )}
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
