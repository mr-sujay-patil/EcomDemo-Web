import type { paths as AppPaths } from './generated/app'
import type { paths as AssistantPaths } from './generated/assistant'
import type { paths as CatalogPaths } from './generated/catalog'
import type { paths as CustomerPaths } from './generated/customer'
import type { paths as InventoryPaths } from './generated/inventory'

/**
 * Who may call what, from the integration guide's tables (sections 3, 5 and "Admin console APIs"),
 * not from the OpenAPI documents: the assistant and inventory documents carry no security markers
 * (web KI-011). A path that disappears from a document stops compiling here.
 */
export type Access = 'anyone' | 'signed-in' | 'customer' | 'admin'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ApiPath = keyof CatalogPaths | keyof CustomerPaths | keyof AppPaths | keyof AssistantPaths | keyof InventoryPaths
type Rule = { method: Method; path: ApiPath; access: Access }

const rules: readonly Rule[] = [
  { method: 'GET', path: '/api/products', access: 'anyone' },
  { method: 'GET', path: '/api/products/{id}', access: 'anyone' },
  { method: 'GET', path: '/api/products/search', access: 'anyone' },
  { method: 'GET', path: '/api/products/{id}/image', access: 'anyone' },
  { method: 'POST', path: '/api/customers/register', access: 'anyone' },
  { method: 'POST', path: '/api/auth/login', access: 'anyone' },
  { method: 'GET', path: '/api/customers/me', access: 'signed-in' },
  { method: 'PUT', path: '/api/customers/me', access: 'signed-in' },
  { method: 'GET', path: '/api/cart', access: 'customer' },
  { method: 'POST', path: '/api/cart/items', access: 'customer' },
  { method: 'PUT', path: '/api/cart/items/{productId}', access: 'customer' },
  { method: 'DELETE', path: '/api/cart/items/{productId}', access: 'customer' },
  { method: 'POST', path: '/api/orders', access: 'customer' },
  { method: 'GET', path: '/api/orders', access: 'customer' },
  { method: 'GET', path: '/api/orders/{id}', access: 'customer' },
  { method: 'GET', path: '/api/orders/{id}/status', access: 'customer' },
  { method: 'POST', path: '/api/assistant/chat', access: 'customer' },
  { method: 'POST', path: '/api/assistant/actions/{actionId}/confirm', access: 'customer' },
  { method: 'POST', path: '/api/products', access: 'admin' },
  { method: 'PUT', path: '/api/products/{id}', access: 'admin' },
  { method: 'DELETE', path: '/api/products/{id}', access: 'admin' },
  { method: 'POST', path: '/api/products/{id}/generate-description', access: 'admin' },
  { method: 'POST', path: '/api/products/embeddings/backfill', access: 'admin' },
  { method: 'GET', path: '/api/products/embeddings/backfill/{executionId}', access: 'admin' },
  { method: 'GET', path: '/api/inventory', access: 'admin' },
  { method: 'GET', path: '/api/inventory/{productId}', access: 'admin' },
  { method: 'PUT', path: '/api/inventory/{productId}', access: 'admin' },
  { method: 'POST', path: '/api/admin/batch/product-import', access: 'admin' },
  { method: 'GET', path: '/api/admin/batch/executions/{id}', access: 'admin' },
  { method: 'POST', path: '/api/admin/batch/executions/{id}/restart', access: 'admin' },
  { method: 'GET', path: '/api/admin/dead-letters', access: 'admin' },
  { method: 'POST', path: '/api/admin/dead-letters/{topic}/{partition}/{offset}/replay', access: 'admin' },
  { method: 'GET', path: '/api/admin/dead-letters/replays', access: 'admin' },
]

/**
 * In the documents but not for the browser. The guide names the first two as service-to-service
 * calls (the import and the order saga). The inventory reserve and release calls were removed by the backend (KI-011, pin f088fd4). DELETE /api/inventory/{productId} is not in the guide at
 * all; it is kept out of the app until the backend team says who may call it.
 */
export const notForTheFrontend: readonly Pick<Rule, 'method' | 'path'>[] = [
  { method: 'POST', path: '/api/products/batch' },
  { method: 'POST', path: '/api/inventory/orders/{orderId}/close' },
  { method: 'DELETE', path: '/api/inventory/{productId}' },
]

/** The role the guide requires for this call, or undefined when the guide does not cover it. */
export function accessFor(method: string, path: string): Access | undefined {
  return rules.find((rule) => rule.method === method.toUpperCase() && rule.path === path)?.access
}
