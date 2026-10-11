import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Button } from '../Button'
import { Price } from '../Price'
import { ProductTile } from '../ProductTile'
import { addLabel, STOCK_CLASS, stockLevel, stockText } from './stock'
import './ProductCard.css'

export { LOW_STOCK } from './stock'

export type ProductCardProps = {
  name: string
  description?: string
  /** Rupees, as the server sent them. */
  price: number
  compareAt?: number
  category?: string | null
  /** The product's `imageUrl`; without one the well says "Photo to come". */
  image?: string | null
  /** 0 = out of stock, 1 to 5 = low. */
  stock?: number
  inCart?: number
  /** Shows the Add to cart button. Leave it out where adding is not possible yet. */
  onAdd?: () => void
  /** The heading level of the name: 3 by default, 2 on a page whose h1 is followed straight by cards. */
  headingLevel?: 2 | 3
  /** Wraps the name, for example in a router link. The link then covers the whole card. */
  renderName?: (name: string) => ReactNode
}

function StockHint({ stock }: Readonly<{ stock: number | undefined }>) {
  const level = stockLevel(stock)
  if (level === 'none' || stock === undefined) return null
  return <span className={cx('ed-stock', STOCK_CLASS[level])}>{stockText(level, stock)}</span>
}

export function ProductCard({
  name,
  description,
  price,
  compareAt,
  category,
  image,
  stock,
  inCart = 0,
  onAdd,
  headingLevel = 3,
  renderName,
}: Readonly<ProductCardProps>) {
  const out = stock === 0
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="ed-card ed-product">
      <ProductTile category={category} image={image} alt={name} />
      <div className="ed-product-body">
        {category ? <p className="ed-overline">{category}</p> : null}
        <Heading className="ed-product-name">{renderName ? renderName(name) : name}</Heading>
        {description ? <p className="ed-product-desc">{description}</p> : null}
        <div className="ed-product-foot">
          <Price amount={price} compareAt={compareAt} />
          <StockHint stock={stock} />
        </div>
        {onAdd ? (
          <Button
            variant={inCart ? 'secondary' : 'primary'}
            icon={inCart ? 'check' : undefined}
            block
            disabled={out}
            onClick={onAdd}
          >
            {addLabel(out, inCart)}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
