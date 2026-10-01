import { Link, useSearchParams } from 'react-router'
import { ErrorPanel } from '@/components/ErrorPanel'
import { formatPrice } from '@/lib/money'
import { usePrefetchProduct, useProducts } from './api'
import { applyShelf, categoriesOf, categoryOf, parseShelf, sortOptions, toSearchParams, type ShelfState } from './shelf'
import type { ProductResponse } from './products'

// The results area keeps this height while loading and after, so the footer does not jump when the
// products arrive. Phase 9 replaces it with a token-based class.
const reserveResults = { minHeight: '24rem' }

export function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const shelf = parseShelf(params)
  const products = useProducts()

  function show(next: Partial<ShelfState>) {
    setParams(toSearchParams({ ...shelf, ...next }))
  }

  return (
    <>
      <h1>Products</h1>
      {products.isPending && (
        <div style={reserveResults}>
          <p role="status">Loading products…</p>
        </div>
      )}
      {products.isError && <ErrorPanel error={products.error} onRetry={() => void products.refetch()} />}
      {products.isSuccess &&
        (products.data.length === 0 ? (
          <p>No products yet.</p>
        ) : (
          <Shelf products={products.data} shelf={shelf} show={show} />
        ))}
    </>
  )
}

function Shelf({
  products,
  shelf,
  show,
}: {
  products: ProductResponse[]
  shelf: ShelfState
  show: (next: Partial<ShelfState>) => void
}) {
  const prefetch = usePrefetchProduct()
  const result = applyShelf(products, shelf)
  // A shared link may name a category that no longer exists: keep it in the list so the control still says what is filtered.
  const categories = categoriesOf(products)
  if (shelf.category !== null && !categories.includes(shelf.category)) categories.push(shelf.category)

  return (
    <>
      <form
        aria-label="Filter and sort the products"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label>
          Category{' '}
          <select
            value={shelf.category ?? ''}
            onChange={(event) => show({ category: event.target.value || null, page: 1 })}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>{' '}
        <label>
          Sort by{' '}
          <select
            value={shelf.sort}
            onChange={(event) =>
              show({ sort: parseShelf(new URLSearchParams({ sort: event.target.value })).sort, page: 1 })
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div style={reserveResults}>
        {/* aria-live, not role="status": it announces a changed count without being a loading message. */}
        <p aria-live="polite">
          {result.total === 0
            ? 'No products match.'
            : `Showing ${result.first}–${result.last} of ${result.total} products`}
        </p>
        {result.total === 0 ? (
          <p>
            <Link to="/">Show all products</Link>
          </p>
        ) : (
          <ul>
            {result.items.map((product) => (
              <li key={product.id}>
                <h2>
                  <Link
                    to={`/products/${product.id}`}
                    onMouseEnter={() => prefetch(product.id)}
                    onFocus={() => prefetch(product.id)}
                  >
                    {product.name}
                  </Link>
                </h2>
                <p>{formatPrice(product.price)}</p>
                <p>Category: {categoryOf(product)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.pageCount > 1 && (
        <nav aria-label="Pagination">
          {result.page > 1 && (
            <Link to={{ search: toSearchParams({ ...shelf, page: result.page - 1 }).toString() }}>Previous page</Link>
          )}{' '}
          <span>
            Page {result.page} of {result.pageCount}
          </span>{' '}
          {result.page < result.pageCount && (
            <Link to={{ search: toSearchParams({ ...shelf, page: result.page + 1 }).toString() }}>Next page</Link>
          )}
        </nav>
      )}
    </>
  )
}
