import { customerApi } from '@/api/client'
import type { components } from '@/api/generated/customer'

export type RegisterRequest = components['schemas']['RegisterRequest']
export type CustomerResponse = components['schemas']['CustomerResponse']
export type LoginRequest = components['schemas']['LoginRequest']

/**
 * POST /api/customers/register. Rejects with an `ApiError`: 400 names every rejected field in its message,
 * 409 means the username is taken. Registration does not sign the person in.
 */
export async function registerCustomer(body: RegisterRequest, signal?: AbortSignal): Promise<CustomerResponse> {
  const { data } = await customerApi.POST('/api/customers/register', { body, signal })
  if (!data) throw new Error('The server answered without an account.')
  return data
}

/**
 * POST /api/auth/login. Rejects with an `ApiError`: 401 for wrong credentials (the same for a wrong password
 * and an unknown username), 429 with `retryAfter` after repeated failures. Keeping the token is Phase 11,
 * so for now the answer is only checked, not returned.
 */
export async function checkCredentials(body: LoginRequest, signal?: AbortSignal): Promise<void> {
  await customerApi.POST('/api/auth/login', { body, signal })
}
