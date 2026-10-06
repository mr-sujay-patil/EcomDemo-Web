import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Button } from '../Button'
import { Price } from '../Price'
import { ProductTile } from '../ProductTile'
import './ProductCard.css'

/** What the shelf says about stock: a hint, not a promise (checkout still re-checks). */
export const LOW_STOCK = 5

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
}: ProductCardProps) {
  const out = stock === 0
  const low = !out && stock !== undefined && stock <= LOW_STOCK
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
          {stock === undefined ? null : (
            <span className={cx('ed-stock', out ? 'is-out' : low ? 'is-low' : 'is-in')}>
              {out ? 'Out of stock' : low ? `Only ${stock} left` : `${stock} in stock`}
            </span>
          )}
        </div>
        {onAdd ? (
          <Button
            variant={inCart ? 'secondary' : 'primary'}
            icon={inCart ? 'check' : undefined}
            block
            disabled={out}
            onClick={onAdd}
          >
            {out ? 'Out of stock' : inCart ? `In your cart (${inCart})` : 'Add to cart'}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
