import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { cartKeys } from '@/features/cart/api'
import { confirmAction, sendChat, type PendingCartAddition } from './assistant'

/** What the assistant offers to add. It stays "offered" until the customer presses a button: nothing reaches the cart before that. */
export type Proposal = {
  action: PendingCartAddition
  state: 'offered' | 'adding' | 'added' | 'dismissed' | 'expired'
}

export type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; sources: string[]; proposal?: Proposal }
  // Our own notes in the thread (a failure, a confirmation): not the model's words, so no "Shop assistant" label.
  | { id: number; role: 'note'; text: string }

/** Titles of what the assistant looked at, without repeats. */
const titlesOf = (sources: readonly { title: string }[]) => [...new Set(sources.map((source) => source.title))]

/**
 * One conversation, for as long as the sheet's owner lives (the session: it is kept in memory, never stored). The
 * `conversationId` the server returns goes back with the next message so the assistant keeps the context.
 */
export function useConversation() {
  const queryClient = useQueryClient()
  const [turns, setTurns] = useState<Turn[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  // No model on the backend (503): the thread says so once and stops sending.
  const [unavailable, setUnavailable] = useState(false)
  // The last thing the person typed, so "search instead" can search their own words.
  const [lastMessage, setLastMessage] = useState('')
  const nextId = useRef(0)
  const id = () => nextId.current++

  const chat = useMutation({
    mutationFn: ({ message }: { message: string }) => sendChat(message, conversationId),
    onSuccess: (reply) => {
      setConversationId(reply.conversationId)
      setTurns((all) => [
        ...all,
        {
          id: id(),
          role: 'assistant',
          text: reply.answer,
          sources: titlesOf(reply.sources),
          ...(reply.pendingAction ? { proposal: { action: reply.pendingAction, state: 'offered' as const } } : {}),
        },
      ])
    },
    onError: (error) => {
      if (error.status === 503) {
        setUnavailable(true)
        return
      }
      setTurns((all) => [...all, { id: id(), role: 'note', text: error.message }])
    },
  })

  function setProposal(turnId: number, state: Proposal['state']) {
    setTurns((all) =>
      all.map((turn) =>
        turn.id === turnId && turn.role === 'assistant' && turn.proposal
          ? { ...turn, proposal: { ...turn.proposal, state } }
          : turn,
      ),
    )
  }

  const confirm = useMutation({
    mutationFn: ({ action }: { turnId: number; action: PendingCartAddition }) => confirmAction(action.id),
    onMutate: ({ turnId }) => setProposal(turnId, 'adding'),
    onSuccess: async (added, { turnId }) => {
      setProposal(turnId, 'added')
      setTurns((all) => [
        ...all,
        { id: id(), role: 'note', text: `Added ${added.quantity} × ${added.productName} to your cart.` },
      ])
      await queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
    onError: (error, { turnId }) => {
      if (error.status === 404) {
        setProposal(turnId, 'expired')
        setTurns((all) => [
          ...all,
          {
            id: id(),
            role: 'note',
            text: 'That suggestion has expired or was already added. Ask again and I will suggest it again.',
          },
        ])
        return
      }
      // Anything else: the suggestion may still be good, so it stays offered and the person can try again.
      setProposal(turnId, 'offered')
      setTurns((all) => [...all, { id: id(), role: 'note', text: error.message }])
    },
  })

  return {
    turns,
    unavailable,
    lastMessage,
    thinking: chat.isPending,
    send(message: string) {
      setLastMessage(message)
      setTurns((all) => [...all, { id: id(), role: 'user', text: message }])
      chat.mutate({ message })
    },
    confirm: (turnId: number, action: PendingCartAddition) => confirm.mutate({ turnId, action }),
    dismiss: (turnId: number) => setProposal(turnId, 'dismissed'),
  }
}
