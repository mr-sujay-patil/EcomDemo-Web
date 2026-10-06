import { customerApi } from '@/api/client'
import type { components } from '@/api/generated/customer'

export type TokenResponse = components['schemas']['TokenResponse']
export type CustomerResponse = components['schemas']['CustomerResponse']
export type LoginRequest = components['schemas']['LoginRequest']

/**
 * POST /api/auth/login. Rejects with an `ApiError`: 401 for wrong credentials (the same for a wrong password
 * and an unknown username), 429 with `retryAfter` after repeated failures.
 */
export async function login(body: LoginRequest, signal?: AbortSignal): Promise<TokenResponse> {
  const { data } = await customerApi.POST('/api/auth/login', { body, signal })
  if (!data) throw new Error('The server answered without a session.')
  return data
}

/**
 * GET /api/customers/me with the token just received: the session is not stored yet, so the client's own
 * injection has nothing to send. Rejects with an `ApiError`.
 */
export async function fetchProfile(accessToken: string, signal?: AbortSignal): Promise<CustomerResponse> {
  const { data } = await customerApi.GET('/api/customers/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  })
  if (!data) throw new Error('The server answered without a profile.')
  return data
}
