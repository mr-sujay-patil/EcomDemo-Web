import { assistantApi } from '@/api/client'
import type { components } from '@/api/generated/assistant'

export type PendingCartAddition = components['schemas']['PendingCartAddition']
/** `pendingAction` is `null` when there is nothing to confirm; the document says so since backend KI-086 (web KI-021). */
export type AssistantReply = components['schemas']['AssistantReply']
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
