import { useEffect, useState } from 'react'
import { fetchProducts, ProductsRequestError, type ProductResponse } from './products'

const priceFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; products: ProductResponse[] }
  | { kind: 'failed'; message: string; correlationId: string | null }

// Fetching in useEffect is a stopgap: Phase 8 moves server state into the query cache.
export function ProductListPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(controller.signal)
      .then((products) => setState({ kind: 'loaded', products }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ProductsRequestError) {
          setState({ kind: 'failed', message: error.message, correlationId: error.correlationId })
        } else {
          setState({ kind: 'failed', message: 'Something went wrong while loading the products.', correlationId: null })
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>Products</h1>
      <ProductListBody state={state} />
    </main>
  )
}

function ProductListBody({ state }: { state: LoadState }) {
  switch (state.kind) {
    case 'loading':
      return <p role="status">Loading products…</p>
    case 'failed':
      return (
        <div role="alert">
          <p>{state.message}</p>
          {state.correlationId && (
            <p>
              Reference for support: <code>{state.correlationId}</code>
            </p>
          )}
        </div>
      )
    case 'loaded':
      if (state.products.length === 0) {
        return <p>No products yet.</p>
      }
      return (
        <ul>
          {state.products.map((product) => (
            <li key={product.id}>
              <h2>{product.name}</h2>
              <p>{priceFormat.format(product.price)}</p>
              <p>Category: {product.category ?? 'Other'}</p>
            </li>
          ))}
        </ul>
      )
  }
}
