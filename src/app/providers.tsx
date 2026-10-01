import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ApiError } from '@/api/errors'

declare module '@tanstack/react-query' {
  // Every failed query reaches `error` as the one error type the API client produces.
  interface Register {
    defaultError: ApiError
  }
}

/**
 * The app-wide defaults (the reasons are in docs/decisions.md):
 * - `retry: false`: the API client already retries what is safe to retry, once, in one place
 *   (src/api/retry.ts). A second retry here would turn one failure into four requests.
 * - everything else is TanStack's default: stale at once, garbage-collected five minutes after the
 *   last component stops using it, refetched when the window regains focus. The catalogue, which
 *   changes rarely, opts out per query (src/features/catalog/api.ts).
 */
export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function AppProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
