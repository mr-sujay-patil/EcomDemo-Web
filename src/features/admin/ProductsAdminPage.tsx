import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { supportReference } from '@/api/errors'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { buttonClass } from '@/components/Button'
import { Button } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { TextField } from '@/components/TextField'
import { formatPrice } from '@/lib/money'
import { useProducts } from '@/features/catalog/api'
import type { ProductResponse } from '@/features/catalog/products'
import { useDeleteProduct } from './api'
import { ConfirmDialog } from './ConfirmDialog'

export function ProductsAdminPage() {
  usePageTitle('Products')
  const products = useProducts()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const [target, setTarget] = useState<ProductResponse | null>(null)

  return (
    <div className="stack">
      <div className="admin-head">
        <h1>Products</h1>
        <Link to="new" className={buttonClass({ variant: 'primary' })}>
          <span>New product</span>
        </Link>
      </div>
      {notice ? <Alert tone="success" title={notice} /> : null}
      {products.isError ? <ErrorPanel error={products.error} onRetry={() => void products.refetch()} /> : null}
      {products.isPending ? <p role="status">Loading the products…</p> : null}
      {products.data?.length === 0 ? <p>There are no products yet. Create the first one.</p> : null}
      {products.data && products.data.length > 0 ? (
        <div className="admin-scroll">
          <table className="admin-table">
            <caption className="visually-hidden">Products</caption>
            <thead>
              <tr>
                <th scope="col" className="admin-num">
                  ID
                </th>
                <th scope="col">Name</th>
                <th scope="col">Category</th>
                <th scope="col" className="admin-num">
                  Price
                </th>
                <th scope="col" className="admin-num">
                  Stock
                </th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((product) => (
                <tr key={product.id}>
                  <td className="admin-num admin-mono">{product.id}</td>
                  <th scope="row">{product.name}</th>
                  <td>{product.category ?? '—'}</td>
                  <td className="admin-num admin-mono">{formatPrice(product.price)}</td>
                  <td className="admin-num admin-mono">{product.stockQuantity}</td>
                  <td className="admin-actions">
                    <Link
                      to={String(product.id)}
                      className={buttonClass({ variant: 'secondary', size: 'sm' })}
                      aria-label={`Edit ${product.name}`}
                    >
                      <span>Edit</span>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Delete ${product.name}`}
                      onClick={() => {
                        setTarget(product)
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <DeleteDialog
        product={target}
        onClose={() => {
          setTarget(null)
        }}
      />
    </div>
  )
}

/** Typing the product's name is the confirmation: a delete cannot be done by a stray click or Enter. */
function DeleteDialog({ product, onClose }: { product: ProductResponse | null; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [failure, setFailure] = useState<{ message: string; reference: string | null } | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const remove = useDeleteProduct()

  // The last product shown stays in the dialog while it closes.
  const [shown, setShown] = useState<ProductResponse | null>(null)
  if (product && product !== shown) {
    setShown(product)
    setTyped('')
    setFailure(null)
  }

  async function confirm() {
    if (!shown) return
    try {
      await remove.mutateAsync(shown.id)
      setDone(`Deleted “${shown.name}”.`)
      onClose()
    } catch (error) {
      setFailure({
        message: error instanceof Error ? error.message : 'The product was not deleted.',
        reference: supportReference(error),
      })
    }
  }

  return (
    <>
      {done ? (
        <Alert
          tone="success"
          title={done}
          onClose={() => {
            setDone(null)
          }}
        />
      ) : null}
      <ConfirmDialog
        open={product !== null}
        title="Delete this product?"
        confirmLabel="Delete product"
        tone="danger"
        canConfirm={shown !== null && typed === shown.name}
        pending={remove.isPending}
        onConfirm={() => void confirm()}
        onClose={onClose}
      >
        <p>
          This removes <strong>{shown?.name}</strong> from the shop for good. To confirm, type its name.
        </p>
        <TextField
          label="Product name"
          value={typed}
          autoComplete="off"
          onChange={(event) => {
            setTyped(event.target.value)
          }}
        />
        {failure ? (
          <Alert tone="danger" title={failure.message}>
            {failure.reference ? <code>{failure.reference}</code> : null}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </>
  )
}
