import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogKeys } from '@/features/catalog/api'
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
