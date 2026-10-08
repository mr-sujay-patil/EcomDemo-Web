import { useState } from 'react'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { useImportProducts, useRestartImport } from './api'
import type { ImportResult } from './batch'
import { failureOf, type Failure } from './failure'
import { IMPORT_HEADER, previewCsv, type CsvPreview } from './csv'

/** The server stops a run that should not go on; a few statuses the page treats as "finished well". */
const isFailed = (result: ImportResult) => result.execution.status !== 'COMPLETED'

export function ImportPage() {
  usePageTitle('Import products')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [problem, setProblem] = useState<Failure | null>(null)
  const upload = useImportProducts()
  const restart = useRestartImport()

  async function choose(chosen: File | undefined) {
    setResult(null)
    setProblem(null)
    setFile(chosen ?? null)
    setPreview(chosen ? previewCsv(await chosen.text()) : null)
  }

  async function run(action: () => Promise<ImportResult>) {
    setProblem(null)
    try {
      setResult(await action())
    } catch (error) {
      setProblem(failureOf(error, 'The import did not run.'))
    }
  }

  return (
    <div className="stack">
      <h1>Import products</h1>
      <p>
        Upload a CSV file with a header row and these columns, in this order: <code>{IMPORT_HEADER.join(',')}</code>. A
        row whose name matches an existing product updates that product; any other row creates one. Rows that fail the
        shop&apos;s checks are skipped, not fatal.
      </p>
      <div className="ed-field">
        <label className="ed-field-label" htmlFor="import-file">
          CSV file
        </label>
        <input
          id="import-file"
          className="admin-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void choose(event.target.files?.[0])}
        />
      </div>
      {preview && !preview.ok ? (
        <Alert tone="danger" title="This file cannot be imported">
          {preview.reason}
        </Alert>
      ) : null}
      {preview?.ok ? (
        <section className="stack" aria-labelledby="preview-title">
          <h2 id="preview-title">Preview</h2>
          <p className="ed-caption">
            The first {preview.rows.length} of {preview.rowCount} rows, as the file has them. The shop checks every row
            when you import.
          </p>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  {IMPORT_HEADER.map((name) => (
                    <th key={name} scope="col">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={index}>
                    {IMPORT_HEADER.map((name, column) => (
                      <td key={name}>{row[column] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button loading={upload.isPending} onClick={() => file && void run(() => upload.mutateAsync(file))}>
              Import {preview.rowCount} rows
            </Button>
          </div>
          {upload.isPending ? (
            <p role="status">Importing. The shop finishes the whole file before it answers…</p>
          ) : null}
        </section>
      ) : null}
      {problem ? (
        <Alert tone="danger" title={problem.message}>
          {problem.reference ? <code>{problem.reference}</code> : null}
        </Alert>
      ) : null}
      {result ? (
        <Result
          result={result}
          restarting={restart.isPending}
          onRestart={() => void run(() => restart.mutateAsync(result.execution.id))}
        />
      ) : null}
    </div>
  )
}

function Result({
  result,
  restarting,
  onRestart,
}: {
  result: ImportResult
  restarting: boolean
  onRestart: () => void
}) {
  const { execution } = result
  const failed = isFailed(result)
  return (
    <section className="stack" aria-labelledby="result-title">
      <h2 id="result-title">Result</h2>
      <Alert
        tone={failed ? 'danger' : execution.skipCount > 0 ? 'warning' : 'success'}
        title={failed ? `The import ended as ${execution.status}.` : 'The import finished.'}
      >
        {execution.failureMessage ? <p>{execution.failureMessage}</p> : null}
      </Alert>
      <dl className="admin-facts">
        <div>
          <dt className="ed-caption">Read</dt>
          <dd>{execution.readCount}</dd>
        </div>
        <div>
          <dt className="ed-caption">Written</dt>
          <dd>{execution.writeCount}</dd>
        </div>
        <div>
          <dt className="ed-caption">Skipped</dt>
          <dd>{execution.skipCount}</dd>
        </div>
      </dl>
      {execution.skipCount > 0 ? (
        <p>
          {execution.skipCount} {execution.skipCount === 1 ? 'row was' : 'rows were'} skipped. They are listed in the
          error file on the server: <code>{result.errorFile}</code>
        </p>
      ) : null}
      {failed ? (
        <div>
          <Button variant="secondary" loading={restarting} onClick={onRestart}>
            Restart this import
          </Button>
        </div>
      ) : null}
    </section>
  )
}
