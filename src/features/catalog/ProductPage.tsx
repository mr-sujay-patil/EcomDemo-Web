import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { ErrorPanel } from '@/components/ErrorPanel'
import { formatPrice } from '@/lib/money'
import { useProduct } from './api'
import { categoryOf, stockHint } from './shelf'

/** `/products/12` is 12; `/products/abc` and `/products/1.5` are not products at all. */
function parseId(value: string | undefined): number | null {
  return value !== undefined && /^[1-9]\d{0,15}$/.test(value) ? Number(value) : null
}

export function ProductPage() {
  const id = parseId(useParams().id)
  const product = useProduct(id)

  // An id that cannot exist is the same answer as one that does not: nothing there.
  if (id === null || (product.error instanceof ApiError && product.error.status === 404)) {
    return (
      <>
        <h1>No longer available</h1>
        <p>This product is not in the catalogue any more, or the link is wrong.</p>
        <p>
          <Link to="/">Back to all products</Link>
        </p>
      </>
    )
  }

  if (product.isError) {
    return (
      <>
        <h1>Product</h1>
        <ErrorPanel error={product.error} onRetry={() => void product.refetch()} />
      </>
    )
  }

  if (product.isPending) {
    return (
      <>
        <h1>Product</h1>
        <div style={{ minHeight: '12rem' }}>
          <p role="status">Loading the product…</p>
        </div>
      </>
    )
  }

  const { name, description, price, stockQuantity } = product.data
  return (
    <>
      <h1>{name}</h1>
      <p>Category: {categoryOf(product.data)}</p>
      <p>{formatPrice(price)}</p>
      {description && <p>{description}</p>}
      <p>{stockHint(stockQuantity)}</p>
      {/* Phase 12 enables this: it needs a signed-in customer and the cart. */}
      <button type="button" disabled aria-describedby="add-to-cart-note">
        Add to cart
      </button>
      <p id="add-to-cart-note">
        <Link to="/sign-in">Sign in</Link> to add to your cart
      </p>
      <p>
        <Link to="/">Back to all products</Link>
      </p>
    </>
  )
}
