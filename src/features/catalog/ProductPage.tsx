import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Button, buttonClass } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { Price } from '@/components/Price'
import { ProductTile } from '@/components/ProductTile'
import { useAddAction } from '@/features/cart/useAddAction'
import { useProduct } from './api'
import { categoryOf, stockHint, stockTone } from './shelf'
import './catalog.css'

/** `/products/12` is 12; `/products/abc` and `/products/1.5` are not products at all. */
function parseId(value: string | undefined): number | null {
  return value !== undefined && /^[1-9]\d{0,15}$/.test(value) ? Number(value) : null
}

export function ProductPage() {
  const id = parseId(useParams().id)
  const product = useProduct(id)
  const cart = useAddAction()

  // An id that cannot exist is the same answer as one that does not: nothing there.
  if (id === null || (product.error instanceof ApiError && product.error.status === 404)) {
    return (
      <div className="stack">
        <h1>No longer available</h1>
        <p>This product is not in the catalogue any more, or the link is wrong.</p>
        <Link to="/" className={buttonClass({ variant: 'secondary' })}>
          <span>Back to all products</span>
        </Link>
      </div>
    )
  }

  if (product.isError) {
    return (
      <div className="stack">
        <h1>Product</h1>
        <ErrorPanel error={product.error} onRetry={() => void product.refetch()} />
      </div>
    )
  }

  if (product.isPending) {
    return (
      <div className="stack">
        <h1>Product</h1>
        <div className="reserve-sm">
          <p role="status">Loading the product…</p>
        </div>
      </div>
    )
  }

  const { name, description, price, stockQuantity, imageUrl } = product.data
  const category = categoryOf(product.data)
  return (
    <div className="product-wrap">
      <div className="product-layout">
        <ProductTile category={category} image={imageUrl} alt={name} />
        <div className="product-details">
          <p className="ed-overline">{category}</p>
          <h1>{name}</h1>
          <Price amount={price} size="lg" />
          <p className={`ed-stock is-${stockTone(stockQuantity)}`}>{stockHint(stockQuantity)}</p>
          {description && <p className="ed-product-desc">{description}</p>}
          {cart.error ? (
            <Alert tone="danger" title="Could not add it to your cart" onClose={cart.dismiss}>
              {cart.error.message}
            </Alert>
          ) : null}
          {cart.canAdd ? (
            <Button
              block
              icon={cart.inCart(product.data.id) ? 'check' : undefined}
              variant={cart.inCart(product.data.id) ? 'secondary' : 'primary'}
              loading={cart.adding === product.data.id}
              onClick={() => cart.add(product.data.id)}
            >
              {cart.inCart(product.data.id) ? `In your cart (${cart.inCart(product.data.id)})` : 'Add to cart'}
            </Button>
          ) : null}
          <Link to="/" className={buttonClass({ variant: 'ghost' })}>
            <span>Back to all products</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
