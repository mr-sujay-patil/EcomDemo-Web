import { appApi, catalogApi } from '@/api/client'
import type { components as App } from '@/api/generated/app'
import type { components as Catalog } from '@/api/generated/catalog'

export type ImportResult = App['schemas']['ProductImportResponse']
export type JobExecution = App['schemas']['JobExecutionResponse']
export type BackfillStatus = Catalog['schemas']['BackfillStatus']

/** The multipart body: the CSV in the field `file`. The browser adds the boundary and the content type itself. */
export function importForm(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

/**
 * POST /api/admin/batch/product-import, `multipart/form-data` with the CSV in the field `file`. The server runs the
 * whole job before it answers, so this call can take a while. Not retried: a lost reply does not mean nothing was imported.
 */
export async function importProducts(file: File, signal?: AbortSignal): Promise<ImportResult> {
  const { data } = await appApi.POST('/api/admin/batch/product-import', {
    // The document types the part as text; the real body is a FormData, and the browser adds the boundary itself.
    body: { file: '' },
    bodySerializer: () => importForm(file),
    signal,
  })
  if (!data) throw new Error('The server answered without an import result.')
  return data
}

/** POST /api/admin/batch/executions/{id}/restart. 409 means it cannot be restarted. */
export async function restartImport(id: number, signal?: AbortSignal): Promise<ImportResult> {
  const { data } = await appApi.POST('/api/admin/batch/executions/{id}/restart', { params: { path: { id } }, signal })
  if (!data) throw new Error('The server answered without an import result.')
  return data
}

/** POST /api/products/embeddings/backfill: 202 with the run that was started. 503 when no embedding model is configured. */
export async function startBackfill(signal?: AbortSignal): Promise<BackfillStatus> {
  const { data } = await catalogApi.POST('/api/products/embeddings/backfill', { signal })
  if (!data) throw new Error('The server answered without a run.')
  return data
}

/** GET /api/products/embeddings/backfill/{executionId}. */
export async function fetchBackfill(executionId: number, signal?: AbortSignal): Promise<BackfillStatus> {
  const { data } = await catalogApi.GET('/api/products/embeddings/backfill/{executionId}', {
    params: { path: { executionId } },
    signal,
  })
  if (!data) throw new Error('The server answered without a run.')
  return data
}

/** The run is over (the poll stops). Anything unknown keeps being polled, but a screen that never ends is stopped by the person leaving. */
export const BACKFILL_DONE = ['COMPLETED', 'FAILED', 'STOPPED', 'ABANDONED']
export const BACKFILL_POLL_MS = 2000
