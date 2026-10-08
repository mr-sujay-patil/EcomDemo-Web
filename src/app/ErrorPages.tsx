import { useEffect, useMemo } from 'react'
import { useRouteError } from 'react-router'
import { Alert } from '@/components/Alert'
import { buttonClass } from '@/components/Button'
import { ErrorReference } from '@/components/ErrorReference'
import { referenceFor, reportError } from './errorReference'

/**
 * What a shopper sees when a page broke. Calm, in the store's voice: what happened, what to do, and a reference to quote.
 * The reference and the console line are made once per error (not on every render).
 */
function useReference(error: unknown) {
  const reference = useMemo(() => referenceFor(error), [error])
  useEffect(() => reportError(error, reference), [error, reference])
  return reference
}

function Explanation({ reference }: { reference: string }) {
  return (
    <div className="stack">
      <p>
        Your cart and orders are safe. Try the page again in a moment, or go back to the products. If it keeps
        happening, quote this reference when you write to us.
      </p>
      <ErrorReference reference={reference} />
    </div>
  )
}

/**
 * The page when the layout itself broke, or something outside the router did: nothing of the shop can be assumed, so this
 * stands alone (its own `main`, a plain link home that reloads the whole app).
 */
export function RootErrorPage({ error }: { error: unknown }) {
  const reference = useReference(error)
  return (
    <main className="page stack" role="alert">
      <h1>Something went wrong</h1>
      <Explanation reference={reference} />
      <p>
        <a className={buttonClass({ variant: 'secondary' })} href="/">
          <span>Back to the products</span>
        </a>
      </p>
    </main>
  )
}

/** The router's `errorElement` for the whole app: the layout is what broke. */
export function RootRouteError() {
  return <RootErrorPage error={useRouteError()} />
}

/**
 * The page in place of one route's content when it broke: the header and footer around it (the layout) keep working, so
 * the shopper can still search, open the cart or go elsewhere.
 */
export function RouteErrorPage({ error }: { error: unknown }) {
  const reference = useReference(error)
  return (
    <div className="stack" role="alert">
      <h1>This page did not load</h1>
      <Explanation reference={reference} />
      <p>
        <a className={buttonClass({ variant: 'secondary' })} href="/">
          <span>Back to the products</span>
        </a>
      </p>
    </div>
  )
}

/** The router's `errorElement` for a route inside the layout. */
export function RouteError() {
  return <RouteErrorPage error={useRouteError()} />
}

/** Shown by the unhandled-rejection handler: the same reference, as an alert on the page that is already there. */
export function RejectionAlert({ reference, onClose }: { reference: string; onClose: () => void }) {
  return (
    <Alert tone="danger" title="Something did not work in the background" onClose={onClose}>
      <ErrorReference reference={reference} />
    </Alert>
  )
}
