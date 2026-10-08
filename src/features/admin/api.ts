import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { catalogKeys } from '@/features/catalog/api'
import { BACKFILL_DONE, BACKFILL_POLL_MS, fetchBackfill, importProducts, restartImport, startBackfill } from './batch'
import { fetchDeadLetters, fetchReplays, replayDeadLetter, type DeadLetter } from './saga'
import { fetchStock, setStock } from './stock'
import { createProduct, deleteProduct, generateDescription, updateProduct, type ProductRequest } from './products'

/** Every product write makes the shelf stale: the shop's pages ask again the next time they are shown. */
export function useSaveProduct(id: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProductRequest) => (id === null ? createProduct(body) : updateProduct(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useGenerateDescription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => generateDescription(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export const stockKeys = {
  all: ['admin', 'stock'] as const,
  levels: (ids: number[]) => [...stockKeys.all, ids.join(',')] as const,
}

/** The levels for the products on screen. Always asked afresh when the page opens: orders move stock. */
export function useStock(productIds: number[]) {
  return useQuery({
    queryKey: stockKeys.levels(productIds),
    queryFn: ({ signal }) => fetchStock(productIds, signal),
    enabled: productIds.length > 0,
    staleTime: 0,
  })
}

export function useSetStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) => setStock(productId, quantity),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
        queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
      ]),
  })
}

export function useImportProducts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => importProducts(file),
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useRestartImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => restartImport(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useBackfill() {
  const [executionId, setExecutionId] = useState<number | null>(null)
  const start = useMutation({
    mutationFn: () => startBackfill(),
    onSuccess: (run) => {
      setExecutionId(run.executionId)
    },
  })
  const run = useQuery({
    queryKey: ['admin', 'backfill', executionId],
    queryFn: ({ signal }) => fetchBackfill(executionId!, signal),
    enabled: executionId !== null,
    // Asked every 2 s until the run ends; the browser pauses it while the tab is hidden.
    refetchInterval: (query) =>
      query.state.data && BACKFILL_DONE.includes(query.state.data.status) ? false : BACKFILL_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  })
  return { start, run }
}

export const sagaKeys = {
  letters: ['admin', 'dead-letters'] as const,
  replays: ['admin', 'replays'] as const,
}

export function useDeadLetters() {
  return useQuery({ queryKey: sagaKeys.letters, queryFn: ({ signal }) => fetchDeadLetters(signal), staleTime: 0 })
}

export function useReplays() {
  return useQuery({ queryKey: sagaKeys.replays, queryFn: ({ signal }) => fetchReplays(signal), staleTime: 0 })
}

export function useReplay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (letter: DeadLetter) => replayDeadLetter(letter),
    // A 409 means someone else replayed it: the lists are stale either way.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sagaKeys.letters }),
        queryClient.invalidateQueries({ queryKey: sagaKeys.replays }),
      ]),
  })
}
