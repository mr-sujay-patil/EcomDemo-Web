import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button, buttonClass } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { ProductCard } from '@/components/ProductCard'
import { TextField } from '@/components/TextField'
import { usePrefetchProduct, useProducts } from '@/features/catalog/api'
import type { ProductResponse } from '@/features/catalog/products'
import { categoriesOf, categoryLabel, categoryOf, OTHER } from '@/features/catalog/shelf'
import { useAddAction } from '@/features/cart/useAddAction'
import { isSearchUnavailable, useSearchResults } from './api'
import { filterCatalogue, parseSearch, toSearchParams, type SearchState } from './search'
import './search.css'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const state = parseSearch(params)
  const results = useSearchResults(state)
  const catalogue = useProducts()
  const unavailable = isSearchUnavailable(results.error)

  return (
    <div className="search-page">
      <h1>{state.q ? `Results for “${state.q}”` : 'Search'}</h1>
      <Filters
        // A new URL starts the form from what the URL says (a shared link, Back); typing in it changes nothing until Apply.
        key={params.toString()}
        state={state}
        // "Other" is the shelf's name for products without a category; the backend has no such category to filter by.
        categories={catalogue.data ? categoriesOf(catalogue.data).filter((category) => category !== OTHER) : []}
        apply={(next) => setParams(toSearchParams(next))}
      />
      {state.q === '' ? (
        <p>
          Type what you are looking for in the box at the top. Describing what it is for works, such as “something to
          type on”.
        </p>
      ) : results.isPending ? (
        <p role="status">Searching…</p>
      ) : results.isSuccess ? (
        <Results products={results.data} mode="meaning" state={state} />
      ) : unavailable ? (
        <Fallback state={state} catalogue={catalogue} />
      ) : (
        <ErrorPanel error={results.error} onRetry={() => void results.refetch()} />
      )}
    </div>
  )
}

function Filters({
  state,
  categories,
  apply,
}: {
  state: SearchState
  categories: string[]
  apply: (next: SearchState) => void
}) {
  const [error, setError] = useState<string | null>(null)
  // A shared link may name a category the catalogue no longer has: keep it so the control still says what is filtered.
  const options = state.category && !categories.includes(state.category) ? [...categories, state.category] : categories

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (name: string) => {
      const value = data.get(name)
      return typeof value === 'string' ? value : ''
    }
    const next = parseSearch(
      new URLSearchParams({
        q: state.q,
        category: text('category'),
        minPrice: text('minPrice'),
        maxPrice: text('maxPrice'),
      }),
    )
    if (next.minPrice !== null && next.maxPrice !== null && next.minPrice > next.maxPrice) {
      setError('The highest price is below the lowest. Swap them or change one.')
      return
    }
    setError(null)
    apply(next)
  }

  return (
    <form className="search-filters" aria-label="Narrow the results" onSubmit={submit}>
      <label className="search-category">
        <span className="ed-field-label">Category</span>
        <select className="select" name="category" defaultValue={state.category ?? ''}>
          <option value="">Any category</option>
          {options.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label="Lowest price"
        name="minPrice"
        type="number"
        inputMode="decimal"
        min={0}
        defaultValue={state.minPrice ?? ''}
      />
      <TextField
        label="Highest price"
        name="maxPrice"
        type="number"
        inputMode="decimal"
        min={0}
        defaultValue={state.maxPrice ?? ''}
        error={error ?? undefined}
      />
      <div className="search-filters-actions">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {state.category || state.minPrice !== null || state.maxPrice !== null ? (
          <Link
            className={buttonClass({ variant: 'ghost' })}
            to={{ search: toSearchParams({ ...state, category: null, minPrice: null, maxPrice: null }).toString() }}
          >
            <span>Clear</span>
          </Link>
        ) : null}
      </div>
    </form>
  )
}

/** Search by meaning is off: say so, then filter the catalogue by the words typed. */
function Fallback({ state, catalogue }: { state: SearchState; catalogue: ReturnType<typeof useProducts> }) {
  return (
    <>
      <Alert tone="info" title="Search by description isn't available right now">
        We are matching the words you typed against product names and descriptions instead.
      </Alert>
      {catalogue.isPending ? (
        <p role="status">Searching…</p>
      ) : catalogue.isError ? (
        <ErrorPanel error={catalogue.error} onRetry={() => void catalogue.refetch()} />
      ) : (
        <Results products={filterCatalogue(catalogue.data, state)} mode="words" state={state} />
      )}
    </>
  )
}

function Results({
  products,
  mode,
  state,
}: {
  products: ProductResponse[]
  mode: 'meaning' | 'words'
  state: SearchState
}) {
  const prefetch = usePrefetchProduct()
  const cart = useAddAction()
  return (
    <>
      {cart.error ? (
        <Alert tone="danger" title="Could not add it to your cart" onClose={cart.dismiss}>
          {cart.error.message}
        </Alert>
      ) : null}
      {/* aria-live: a changed count is announced without being a loading message. */}
      <p className="ed-caption" aria-live="polite">
        {products.length === 0
          ? `Nothing matches “${state.q}”. Try other words, or fewer filters.`
          : `${products.length} ${products.length === 1 ? 'product' : 'products'}, ${
              mode === 'meaning' ? 'best match first' : 'matched on words in the name and description'
            }`}
      </p>
      {/* The server's order is the ranking: no sorting here. */}
      <ul className="search-grid">
        {products.map((product) => (
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
    </>
  )
}
