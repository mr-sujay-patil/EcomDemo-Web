import { formatPrice } from '@/lib/money'
import { cx } from '../cx'
import './Price.css'

export type PriceProps = {
  /** Rupees, as the server sent them. Never a sum made in the browser. */
  amount: number
  compareAt?: number
  size?: 'sm' | 'md' | 'lg'
}

/** Set like a receipt: mono, Indian digit grouping. */
export function Price({ amount, compareAt, size = 'md' }: PriceProps) {
  return (
    <span className={cx('ed-price', `ed-price--${size}`)}>
      <span className="ed-price-now">{formatPrice(amount)}</span>
      {compareAt ? <s className="ed-price-was">{formatPrice(compareAt)}</s> : null}
    </span>
  )
}
