import { Link, useSearchParams } from 'react-router'
import { buttonClass } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { ErrorPanel } from '@/components/ErrorPanel'
import { Alert } from '@/components/Alert'
import { ProductCard } from '@/components/ProductCard'
import { useAddAction } from '@/features/cart/useAddAction'
import { usePrefetchProduct, useProducts } from './api'
import {
  applyShelf,
  categoriesOf,
  categoryLabel,
  categoryOf,
  parseShelf,
  sortOptions,
  toSearchParams,
  type ShelfState,
} from './shelf'
import type { ProductResponse } from './products'
import './catalog.css'

export function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const shelf = parseShelf(params)
  const products = useProducts()

  function show(next: Partial<ShelfState>) {
    setParams(toSearchParams({ ...shelf, ...next }))
  }

  return (
    <div className="shelf">
      <h1>Everything for the desk</h1>
      {products.isPending && (
        // The results area keeps its height while loading and after, so the footer does not jump when the products arrive.
        <div className="reserve">
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
    </div>
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
  const cart = useAddAction()
  const result = applyShelf(products, shelf)
  // A shared link may name a category that no longer exists: keep it in the list so the control still says what is filtered.
  const categories = categoriesOf(products)
  if (shelf.category !== null && !categories.includes(shelf.category)) categories.push(shelf.category)

  return (
    <>
      <form
        className="shelf-controls"
        aria-label="Filter and sort the products"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="shelf-chips" role="group" aria-label="Category">
          <Chip
            selected={shelf.category === null}
            count={products.length}
            onClick={() => show({ category: null, page: 1 })}
          >
            Everything
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category}
              selected={shelf.category === category}
              count={products.filter((product) => categoryOf(product) === category).length}
              onClick={() => show({ category, page: 1 })}
            >
              {categoryLabel(category)}
            </Chip>
          ))}
        </div>
        <label className="shelf-sort">
          <span className="ed-field-label">Sort by</span>
          <select
            className="select"
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

      {cart.error ? (
        <Alert tone="danger" title="Could not add it to your cart" onClose={cart.dismiss}>
          {cart.error.message}
        </Alert>
      ) : null}

      <div className="reserve">
        {/* aria-live, not role="status": it announces a changed count without being a loading message. */}
        <p className="ed-caption shelf-count" aria-live="polite">
          {result.total === 0
            ? 'No products match.'
            : `Showing ${result.first}–${result.last} of ${result.total} products`}
        </p>
        {result.total === 0 ? (
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            <span>Show all products</span>
          </Link>
        ) : (
          <ul className="shelf-grid">
            {result.items.map((product) => (
              <li key={product.id}>
                <ProductCard
                  headingLevel={2}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  category={categoryOf(product)}
                  image={product.imageUrl}
                  stock={product.stockQuantity}
                  inCart={cart.inCart(product.id)}
                  onAdd={cart.canAdd ? () => cart.add(product.id) : undefined}
                  renderName={(name) => (
                    <Link
                      to={`/products/${product.id}`}
                      onMouseEnter={() => prefetch(product.id)}
                      onFocus={() => prefetch(product.id)}
                    >
                      {name}
                    </Link>
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.pageCount > 1 && (
        <nav className="shelf-pages" aria-label="Pagination">
          {result.page > 1 && (
            <Link
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
              to={{ search: toSearchParams({ ...shelf, page: result.page - 1 }).toString() }}
            >
              <span>Previous page</span>
            </Link>
          )}
          <span className="ed-caption">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount && (
            <Link
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
              to={{ search: toSearchParams({ ...shelf, page: result.page + 1 }).toString() }}
            >
              <span>Next page</span>
            </Link>
          )}
        </nav>
      )}
    </>
  )
}
