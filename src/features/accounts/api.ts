import { customerApi } from '@/api/client'
import type { components } from '@/api/generated/customer'

export type RegisterRequest = components['schemas']['RegisterRequest']
export type CustomerResponse = components['schemas']['CustomerResponse']

/**
 * POST /api/customers/register. Rejects with an `ApiError`: 400 names every rejected field in its message,
 * 409 means the username is taken. Registration does not sign the person in.
 */
export async function registerCustomer(body: RegisterRequest, signal?: AbortSignal): Promise<CustomerResponse> {
  const { data } = await customerApi.POST('/api/customers/register', { body, signal })
  if (!data) throw new Error('The server answered without an account.')
  return data
}

export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']

/** GET /api/customers/me: the signed-in customer. Rejects with an `ApiError`. */
export async function fetchMe(signal?: AbortSignal): Promise<CustomerResponse> {
  const { data } = await customerApi.GET('/api/customers/me', { signal })
  if (!data) throw new Error('The server answered without a profile.')
  return data
}

/** PUT /api/customers/me: the full name is the only thing that can change. 400 names the field. */
export async function updateMe(body: UpdateProfileRequest, signal?: AbortSignal): Promise<CustomerResponse> {
  const { data } = await customerApi.PUT('/api/customers/me', { body, signal })
  if (!data) throw new Error('The server answered without a profile.')
  return data
}
