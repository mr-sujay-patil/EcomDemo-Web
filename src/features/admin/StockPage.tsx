import { useState } from 'react'
import { supportReference } from '@/api/errors'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { TextField } from '@/components/TextField'
import { useProducts } from '@/features/catalog/api'
import type { ProductResponse } from '@/features/catalog/products'
import { useSetStock, useStock } from './api'

const WHOLE_NUMBER = /^\d+$/

export function StockPage() {
  usePageTitle('Stock')
  const products = useProducts()
  const ids = (products.data ?? []).map((product) => product.id)
  const stock = useStock(ids)
  const levels = new Map((stock.data ?? []).map((level) => [level.productId, level.quantity]))

  return (
    <div className="stack">
      <h1>Stock</h1>
      <p>
        Each box <strong>sets</strong> the number of units on hand. It is not added to the current level: type 40 and
        the shop has 40.
      </p>
      {products.isError ? <ErrorPanel error={products.error} onRetry={() => void products.refetch()} /> : null}
      {stock.isError ? <ErrorPanel error={stock.error} onRetry={() => void stock.refetch()} /> : null}
      {products.isPending || (ids.length > 0 && stock.isPending) ? <p role="status">Loading the stock…</p> : null}
      {products.data?.length === 0 ? <p>There are no products yet.</p> : null}
      {products.data && stock.data ? (
        <div className="admin-scroll">
          <table className="admin-table">
            <caption className="visually-hidden">Stock levels</caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" className="admin-num">
                  On hand
                </th>
                <th scope="col">Set to</th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((product) => (
                <StockRow key={product.id} product={product} quantity={levels.get(product.id)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function StockRow({ product, quantity }: { product: ProductResponse; quantity: number | undefined }) {
  const set = useSetStock()
  const [typed, setTyped] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState<number | null>(null)

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault()
    setSaved(null)
    const value = typed.trim()
    if (!WHOLE_NUMBER.test(value) || Number(value) > 2_147_483_647) {
      setProblem('Use a whole number, 0 or more.')
      return
    }
    setProblem(null)
    try {
      const level = await set.mutateAsync({ productId: product.id, quantity: Number(value) })
      setSaved(level.quantity)
      setTyped('')
    } catch (error) {
      const reference = supportReference(error)
      setProblem(
        `${error instanceof Error ? error.message : 'The stock level was not saved.'}${reference ? ` Reference for support: ${reference}` : ''}`,
      )
    }
  }

  return (
    <tr>
      <th scope="row">{product.name}</th>
      <td className="admin-num admin-mono">{quantity ?? '—'}</td>
      <td>
        <form
          className="admin-inline"
          aria-label={`Set stock for ${product.name}`}
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <TextField
            label={`New level for ${product.name}`}
            inputMode="numeric"
            autoComplete="off"
            value={typed}
            error={problem ?? undefined}
            onChange={(event) => {
              setTyped(event.target.value)
            }}
          />
          <Button type="submit" variant="secondary" size="sm" loading={set.isPending}>
            Set stock
          </Button>
        </form>
        {saved !== null ? <Alert tone="success" title={`Stock is now ${saved}.`} /> : null}
      </td>
    </tr>
  )
}
