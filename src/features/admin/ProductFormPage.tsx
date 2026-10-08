import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { Button, buttonClass } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { applyServerErrors, Field, Form, FormError, SubmitButton } from '@/components/forms'
import { productQuery } from '@/features/catalog/api'
import { fetchProduct, type ProductResponse } from '@/features/catalog/products'
import { useGenerateDescription, useSaveProduct } from './api'
import { ConfirmDialog } from './ConfirmDialog'
import { failureOf, type Failure } from './failure'
import { DESCRIPTION_MAX, productLabels, productSchema, toRequest, toValues, type ProductValues } from './schemas'
import { TextAreaField } from './TextAreaField'

/** `/admin/products/new` and `/admin/products/:id`. */
export function ProductFormPage() {
  const { id: param } = useParams()
  const id = param === undefined ? null : /^\d+$/.test(param) ? Number(param) : NaN
  usePageTitle(id === null ? 'New product' : 'Edit product')

  // A full replace must start from what the server holds now, not from a shelf cached minutes ago: stock moves with orders.
  const product = useQuery({
    ...productQuery(id ?? 0),
    enabled: id !== null && !Number.isNaN(id),
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0,
  })

  if (id !== null && Number.isNaN(id)) return <NotFound />
  return (
    <div className="stack">
      <p>
        <Link to="/admin/products">← Products</Link>
      </p>
      <h1>{id === null ? 'New product' : 'Edit product'}</h1>
      {id === null ? <ProductForm id={null} /> : null}
      {id !== null && product.isError ? (
        product.error instanceof ApiError && product.error.status === 404 ? (
          <NotFound />
        ) : (
          <ErrorPanel error={product.error} onRetry={() => void product.refetch()} />
        )
      ) : null}
      {id !== null && product.isPending && !product.isError ? <p role="status">Loading the product…</p> : null}
      {id !== null && product.data ? <ProductForm id={id} product={product.data} /> : null}
    </div>
  )
}

function NotFound() {
  return (
    <div className="stack">
      <h1>Product not found</h1>
      <p>This product does not exist, or it was deleted.</p>
      <Link to="/admin/products" className={buttonClass({ variant: 'secondary' })}>
        <span>Back to products</span>
      </Link>
    </div>
  )
}

function ProductForm({ id, product }: { id: number | null; product?: ProductResponse }) {
  const navigate = useNavigate()
  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    mode: 'onTouched',
    defaultValues: toValues(product),
  })
  const [formError, setFormError] = useState<Failure | null>(null)
  const save = useSaveProduct(id)

  async function onSubmit(values: ProductValues) {
    setFormError(null)
    try {
      const saved = await save.mutateAsync(toRequest(values))
      await navigate('/admin/products', {
        state: { notice: id === null ? `Created “${saved.name}”.` : `Saved “${saved.name}”.` },
      })
    } catch (error) {
      const left = applyServerErrors(form, error, productLabels)
      if (left) setFormError(failureOf(error, 'The product was not saved.'))
    }
  }

  return (
    <>
      <FormError reference={formError?.reference}>{formError?.message}</FormError>
      <Form form={form} onSubmit={onSubmit} aria-label={id === null ? 'New product' : 'Edit product'}>
        <Field name="name" label="Name" autoComplete="off" />
        <TextAreaField name="description" label="Description" hint={`Optional, up to ${DESCRIPTION_MAX} characters.`} />
        <Field
          name="price"
          label="Price"
          inputMode="decimal"
          autoComplete="off"
          hint="In rupees, up to two decimals."
        />
        <Field
          name="stockQuantity"
          label="Stock"
          inputMode="numeric"
          autoComplete="off"
          hint="Units on hand. Saving sets this level; it does not add to it."
        />
        <Field name="category" label="Category" autoComplete="off" hint="Optional, like PERIPHERALS." />
        <div className="admin-form-actions">
          <SubmitButton>{id === null ? 'Create product' : 'Save changes'}</SubmitButton>
          <Link to="/admin/products" className={buttonClass({ variant: 'ghost' })}>
            <span>Cancel</span>
          </Link>
        </div>
      </Form>
      {id !== null && product ? (
        <GenerateDescription
          product={product}
          onText={(text) => {
            form.setValue('description', text, { shouldDirty: false, shouldValidate: true })
          }}
        />
      ) : null}
    </>
  )
}

/**
 * Asks the shop's language model for a description. The server saves it to the product as it answers (web KI-022), so
 * the person is told that first, the old text is kept in memory, and "Restore previous" puts it back with a normal PUT.
 */
function GenerateDescription({ product, onText }: { product: ProductResponse; onText: (text: string) => void }) {
  const generate = useGenerateDescription()
  const save = useSaveProduct(product.id)
  const [asking, setAsking] = useState(false)
  const [previous, setPrevious] = useState<string | null>(null)
  const [result, setResult] = useState<{ tags: string[]; seoTitle: string; model: string | null } | null>(null)
  const [restored, setRestored] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)

  async function run() {
    setAsking(false)
    setFailure(null)
    setRestored(false)
    // What the server holds right now is what comes back on Restore: read it before it is replaced.
    try {
      const before = await fetchProduct(product.id)
      const written = await generate.mutateAsync(product.id)
      setPrevious(before.description)
      setResult({ tags: written.tags, seoTitle: written.seoTitle, model: written.model })
      onText(written.description)
    } catch (error) {
      setFailure(
        error instanceof ApiError && error.status === 503
          ? {
              message: 'No language model is configured on the server, so it cannot write descriptions.',
              reference: null,
            }
          : failureOf(error, 'The description was not written.'),
      )
    }
  }

  async function restore(text: string) {
    setFailure(null)
    try {
      // A full replace from the server's current copy, so nothing else on the product is overwritten with stale values.
      const current = await fetchProduct(product.id)
      await save.mutateAsync(toRequest(toValues({ ...current, description: text })))
      onText(text)
      setResult(null)
      setPrevious(null)
      setRestored(true)
    } catch (error) {
      setFailure(failureOf(error, 'The previous description was not restored.'))
    }
  }

  return (
    <section className="stack admin-generate" aria-labelledby="generate-title">
      <h2 id="generate-title">Write a description</h2>
      <p>
        The shop&apos;s language model can write a description, tags and a search title for this product. The new
        description replaces the current one as soon as it is written.
      </p>
      <div>
        <Button
          variant="secondary"
          loading={generate.isPending}
          onClick={() => {
            setAsking(true)
          }}
        >
          Write a description
        </Button>
      </div>
      {failure ? (
        <Alert tone="danger" title={failure.message}>
          {failure.reference ? <code>{failure.reference}</code> : null}
        </Alert>
      ) : null}
      {result && previous !== null ? (
        <Alert tone="success" title="The new description is saved">
          <div className="stack">
            <p>
              It is in the Description box above. Tags: {result.tags.join(', ') || 'none'}. Search title:{' '}
              {result.seoTitle}.{result.model ? ` Written by ${result.model}.` : ''}
            </p>
            <div>
              <Button variant="secondary" size="sm" loading={save.isPending} onClick={() => void restore(previous)}>
                Restore previous
              </Button>
            </div>
          </div>
        </Alert>
      ) : null}
      {restored ? <Alert tone="success" title="The previous description is back." /> : null}
      <ConfirmDialog
        open={asking}
        title="Replace the description now?"
        confirmLabel="Write and replace"
        onConfirm={() => void run()}
        onClose={() => {
          setAsking(false)
        }}
      >
        <p>
          The new text is saved to <strong>{product.name}</strong> the moment it is written; there is no draft step. The
          current description is kept on this page, so Restore previous can put it back until you leave.
        </p>
        <p>Other changes in the form are not saved by this.</p>
      </ConfirmDialog>
    </section>
  )
}
