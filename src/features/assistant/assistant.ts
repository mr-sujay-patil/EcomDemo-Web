import { assistantApi } from '@/api/client'
import type { components } from '@/api/generated/assistant'

export type PendingCartAddition = components['schemas']['PendingCartAddition']
/**
 * The generated `AssistantReply` with `pendingAction` widened to what the backend really sends: `null` when there is
 * nothing to confirm (integration guide, "Shopping assistant"). The OpenAPI document leaves `null` out (web KI-021).
 */
export type AssistantReply = Omit<components['schemas']['AssistantReply'], 'pendingAction'> & {
  pendingAction: PendingCartAddition | null
}
export type ConfirmedAddition = components['schemas']['ConfirmedAddition']

/** The backend's limit on a message (integration guide). */
export const MAX_MESSAGE_LENGTH = 1000

/** POST /api/assistant/chat. Rejects with an `ApiError`; status 503 means no model is configured. */
export async function sendChat(
  message: string,
  conversationId: string | null,
  signal?: AbortSignal,
): Promise<AssistantReply> {
  const { data } = await assistantApi.POST('/api/assistant/chat', {
    body: { message, ...(conversationId ? { conversationId } : {}) },
    signal,
  })
  if (!data) throw new Error('The server answered without a reply.')
  return data
}

/** POST /api/assistant/actions/{id}/confirm: puts the proposed product in the cart. Status 404: unknown, expired or already confirmed. */
export async function confirmAction(actionId: string): Promise<ConfirmedAddition> {
  const { data } = await assistantApi.POST('/api/assistant/actions/{actionId}/confirm', {
    params: { path: { actionId } },
  })
  if (!data) throw new Error('The server answered without a confirmation.')
  return data
}
