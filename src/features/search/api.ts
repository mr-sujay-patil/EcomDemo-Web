import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import { RESULTS_LIMIT, searchProducts, SUGGESTION_LIMIT, type SearchState } from './search'

export const searchKeys = {
  all: ['search'] as const,
  results: (state: SearchState, limit: number) => [...searchKeys.all, limit, state] as const,
}

/** True for the answer that means "search by meaning is not available": the page then filters the catalogue by words. */
export const isSearchUnavailable = (error: unknown) => error instanceof ApiError && error.status === 503

// A search answer is a snapshot of an index the catalogue feeds; a minute is fresh enough that going back to a result list is instant.
const SEARCH_STALE_TIME = 60 * 1000

/**
 * Results for the search page. The query function receives the query's own `signal`: when the key changes (the person typed
 * something else) TanStack aborts the request still in flight, so a slow old answer can never replace a newer one.
 */
export function useSearchResults(state: SearchState) {
  return useQuery({
    queryKey: searchKeys.results(state, RESULTS_LIMIT),
    queryFn: ({ signal }) => searchProducts(state, RESULTS_LIMIT, signal),
    enabled: state.q !== '',
    staleTime: SEARCH_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

/** The header's suggestions: the top five for what has been typed, once the person pauses. */
export function useSuggestions(q: string, wanted: boolean) {
  const state: SearchState = { q, category: null, minPrice: null, maxPrice: null }
  return useQuery({
    queryKey: searchKeys.results(state, SUGGESTION_LIMIT),
    queryFn: ({ signal }) => searchProducts(state, SUGGESTION_LIMIT, signal),
    // Only while the person is typing: a box prefilled from the URL asks for nothing.
    enabled: wanted && q.length >= 2,
    staleTime: SEARCH_STALE_TIME,
    refetchOnWindowFocus: false,
    // The list stays while the next one loads, so the box does not flicker between keystrokes.
    placeholderData: keepPreviousData,
  })
}
