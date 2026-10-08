import { supportReference } from '@/api/errors'
import { ApiError } from '@/api/errors'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { useBackfill } from './api'
import { BACKFILL_DONE } from './batch'

export function SearchIndexPage() {
  usePageTitle('Search index')
  const { start, run } = useBackfill()
  const status = run.data
  const running = start.isPending || (status !== undefined && !BACKFILL_DONE.includes(status.status))
  const unavailable = start.error instanceof ApiError && start.error.status === 503

  return (
    <div className="stack">
      <h1>Search index</h1>
      <p>
        Semantic search finds products by meaning. After you add or import products, rebuild the index so they can be
        found. It re-reads every product, so run it when the shop is quiet.
      </p>
      <div>
        <Button loading={running} onClick={() => start.mutate()}>
          Rebuild the search index
        </Button>
      </div>
      {start.isError ? (
        <Alert tone="danger" title={unavailable ? 'Search is not available right now.' : start.error.message}>
          {unavailable ? <p>No embedding model is configured on the server.</p> : null}
          {supportReference(start.error) ? <code>{supportReference(start.error)}</code> : null}
        </Alert>
      ) : null}
      {run.isError ? <Alert tone="danger" title={run.error.message} /> : null}
      {status ? (
        <section className="stack" aria-labelledby="run-title">
          <h2 id="run-title">Run {status.executionId}</h2>
          <p role="status">
            {status.status === 'COMPLETED'
              ? `Done: ${status.indexedProducts} of ${status.totalProducts} products are indexed.`
              : status.status === 'FAILED'
                ? `The run failed. ${status.failure}`
                : `${status.status}: ${status.written} of ${status.totalProducts} written…`}
          </p>
          {status.totalProducts > 0 ? (
            <progress max={status.totalProducts} value={status.written} aria-label="Products indexed in this run" />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
