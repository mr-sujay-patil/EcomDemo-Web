import { formatPrice } from '@/lib/money'
import { Button } from '../Button'
import { ProductTile } from '../ProductTile'
import { QuantityStepper } from '../QuantityStepper'
import './CartLine.css'

export type CartLineProps = {
  name: string
  category?: string | null
  /** Rupees each, as the server sent them. */
  unitPrice: number
  /** The server's `lineTotal`. The line never multiplies price by quantity itself. */
  lineTotal: number
  quantity: number
  /** A second small line under the price, for example "price when added". */
  priceNote?: string
  max?: number
  onQuantity?: (next: number) => void
  onRemove?: () => void
}

/** Rearranges itself when its container is narrower than 460px (a container query, not a viewport one). */
export function CartLine({
  name,
  category,
  unitPrice,
  lineTotal,
  quantity,
  priceNote,
  max,
  onQuantity,
  onRemove,
}: CartLineProps) {
  return (
    <div className="ed-cartline-wrap">
      <div className="ed-cartline">
        <ProductTile category={category} size="sm" />
        <div className="ed-cartline-main">
          <p className="ed-cartline-name">{name}</p>
          <p className="ed-caption">{`${formatPrice(unitPrice)} each`}</p>
          {priceNote ? <p className="ed-caption">{priceNote}</p> : null}
        </div>
        <QuantityStepper value={quantity} onChange={onQuantity} max={max} label={`Quantity of ${name}`} />
        <span className="ed-cartline-total">{formatPrice(lineTotal)}</span>
        <Button variant="ghost" size="sm" icon="trash" aria-label={`Remove ${name}`} onClick={onRemove} />
      </div>
    </div>
  )
}
