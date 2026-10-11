import { ApiError, supportReference } from '@/api/errors'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { useBackfill } from './api'
import { BACKFILL_DONE, backfillSummary } from './batch'

export function SearchIndexPage() {
  usePageTitle('Search index')
  const { start, run } = useBackfill()
  const status = run.data
  const running = start.isPending || (status !== undefined && !BACKFILL_DONE.includes(status.status))

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
      {start.isError ? <StartFailure error={start.error} /> : null}
      {run.isError ? <Alert tone="danger" title={run.error.message} /> : null}
      {status ? (
        <section className="stack" aria-labelledby="run-title">
          <h2 id="run-title">Run {status.executionId}</h2>
          <p role="status">{backfillSummary(status)}</p>
          {status.totalProducts > 0 ? (
            <progress max={status.totalProducts} value={status.written} aria-label="Products indexed in this run" />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

/** Why the run did not start: 503 means the server has no embedding model, anything else says what the server said. */
function StartFailure({ error }: Readonly<{ error: Error }>) {
  const unavailable = error instanceof ApiError && error.status === 503
  const reference = supportReference(error)
  return (
    <Alert tone="danger" title={unavailable ? 'Search is not available right now.' : error.message}>
      {unavailable ? <p>No embedding model is configured on the server.</p> : null}
      {reference ? <code>{reference}</code> : null}
    </Alert>
  )
}
