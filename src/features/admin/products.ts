import { catalogApi } from '@/api/client'
import type { components } from '@/api/generated/catalog'
import type { ProductResponse } from '@/features/catalog/products'

export type ProductRequest = components['schemas']['ProductRequest']
export type GeneratedDescription = components['schemas']['GeneratedDescriptionResponse']

/** POST /api/products. 400 names every rejected field in its message. */
export async function createProduct(body: ProductRequest, signal?: AbortSignal): Promise<ProductResponse> {
  const { data } = await catalogApi.POST('/api/products', { body, signal })
  if (!data) throw new Error('The server answered without a product.')
  return data
}

/** PUT /api/products/{id}: a full replace, so every field is sent. 404 means the product is gone. */
export async function updateProduct(id: number, body: ProductRequest, signal?: AbortSignal): Promise<ProductResponse> {
  const { data } = await catalogApi.PUT('/api/products/{id}', { params: { path: { id } }, body, signal })
  if (!data) throw new Error('The server answered without a product.')
  return data
}

/** DELETE /api/products/{id}: 204 with no body. */
export async function deleteProduct(id: number, signal?: AbortSignal): Promise<void> {
  await catalogApi.DELETE('/api/products/{id}', { params: { path: { id } }, signal })
}

/**
 * POST /api/products/{id}/generate-description. The server SAVES the text to the product as it answers (web KI-022),
 * so this is a write, not a draft. 503 means no language model is configured.
 */
export async function generateDescription(id: number, signal?: AbortSignal): Promise<GeneratedDescription> {
  const { data } = await catalogApi.POST('/api/products/{id}/generate-description', {
    params: { path: { id } },
    signal,
  })
  if (!data) throw new Error('The server answered without a description.')
  return data
}
