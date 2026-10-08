import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { AssistantMessage } from '@/components/AssistantMessage'
import { Button, buttonClass } from '@/components/Button'
import { useProduct } from '@/features/catalog/api'
import { categoryOf } from '@/features/catalog/shelf'
import { signInPath } from '@/features/auth/nextPath'
import { useSession } from '@/features/auth/useSession'
import { MAX_MESSAGE_LENGTH } from './assistant'
import { useConversation, type Turn } from './useConversation'
import './assistant.css'

/**
 * The shop assistant in a native `<dialog>`, opened with `showModal()`. The browser does the hard parts of a modal: it
 * traps focus inside, makes the page behind inert, closes on Escape, and gives focus back to the button that opened it.
 * The conversation lives in the component that renders this, so closing the sheet does not lose it.
 */
export function AssistantSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)

  // Opening is the owner's `open` going true; closing is always the dialog's own (Escape, Close, the backdrop), which
  // reaches the owner through `onClose`, so there is nothing to do here when `open` goes false.
  useEffect(() => {
    if (!open) return
    dialog.current?.showModal()
    field.current?.focus()
  }, [open])

  return (
    <dialog
      ref={(element) => {
        dialog.current = element
        // A click on the backdrop lands on the dialog element itself, not on anything inside it. A mouse convenience only:
        // the keyboard has Escape and the Close button, so this is a listener and not a handler on a non-interactive element.
        const onClick = (event: MouseEvent) => {
          if (event.target === element) element?.close()
        }
        element?.addEventListener('click', onClick)
        return () => element?.removeEventListener('click', onClick)
      }}
      className="assistant-sheet"
      aria-labelledby="assistant-title"
      // Escape and the Close button both end in the dialog's own `close` event, so the owner's state follows the dialog.
      onClose={onClose}
    >
      <header className="assistant-head">
        <h2 id="assistant-title">Ask the shop</h2>
        <Button variant="ghost" size="sm" icon="x" aria-label="Close" onClick={() => dialog.current?.close()} />
      </header>
      <SheetBody field={field} close={() => dialog.current?.close()} />
    </dialog>
  )
}

function SheetBody({ field, close }: { field: React.RefObject<HTMLTextAreaElement | null>; close: () => void }) {
  const { role } = useSession()
  const location = useLocation()

  if (role === null) {
    return (
      <div className="assistant-body">
        <p>Sign in to ask the shop. It can answer questions about the products and suggest what to add to your cart.</p>
        <Link to={signInPath(location)} className={buttonClass({ variant: 'primary' })} onClick={close}>
          <span>Sign in</span>
        </Link>
      </div>
    )
  }
  if (role !== 'CUSTOMER') {
    return (
      <div className="assistant-body">
        <p>Ask the shop is for customer accounts.</p>
      </div>
    )
  }
  return <Conversation field={field} close={close} />
}

function Conversation({ field, close }: { field: React.RefObject<HTMLTextAreaElement | null>; close: () => void }) {
  const conversation = useConversation()
  const [text, setText] = useState('')
  const thread = useRef<HTMLDivElement>(null)
  const { turns, thinking, unavailable } = conversation

  // Keep the newest message in view.
  useEffect(() => {
    // The browser clamps a top beyond the end to the end.
    thread.current?.scrollTo({ top: Number.MAX_SAFE_INTEGER })
  }, [turns.length, thinking, unavailable])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const message = text.trim()
    if (!message || thinking || unavailable) return
    conversation.send(message)
    setText('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter is a new line.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <>
      <div className="assistant-thread" ref={thread}>
        {turns.length === 0 && !unavailable ? (
          <p className="ed-caption">
            Ask about the products, for example “Which headphones are good for a long flight?”. Nothing goes into your
            cart unless you press Add it.
          </p>
        ) : null}
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} conversation={conversation} />
        ))}
        {thinking ? (
          <p className="ed-caption" role="status">
            Thinking…
          </p>
        ) : null}
        {unavailable ? (
          <div className="assistant-note" role="status">
            <p>The assistant isn&apos;t available right now.</p>
            <Link
              to={`/search?q=${encodeURIComponent(conversation.lastMessage.slice(0, 200))}`}
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
              onClick={close}
            >
              <span>Search the shop instead</span>
            </Link>
          </div>
        ) : null}
      </div>
      <form className="assistant-form" onSubmit={submit}>
        <label className="ed-field-label" htmlFor="assistant-message">
          Your message
        </label>
        <textarea
          id="assistant-message"
          ref={field}
          className="assistant-input"
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          value={text}
          disabled={unavailable}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" disabled={!text.trim() || thinking || unavailable}>
          Send
        </Button>
      </form>
    </>
  )
}

function TurnView({ turn, conversation }: { turn: Turn; conversation: ReturnType<typeof useConversation> }) {
  if (turn.role === 'user') return <AssistantMessage role="user">{turn.text}</AssistantMessage>
  if (turn.role === 'note') {
    return (
      <p className="assistant-note" role="status">
        {turn.text}
      </p>
    )
  }
  return <AssistantTurn turn={turn} conversation={conversation} />
}

function AssistantTurn({
  turn,
  conversation,
}: {
  turn: Extract<Turn, { role: 'assistant' }>
  conversation: ReturnType<typeof useConversation>
}) {
  const { proposal } = turn
  // Category and photo for the proposal's tile come from the product (already cached once the shelf was open).
  const product = useProduct(
    proposal?.state === 'offered' || proposal?.state === 'adding' ? proposal.action.productId : null,
  )
  const offered = proposal && (proposal.state === 'offered' || proposal.state === 'adding')
  return (
    <AssistantMessage
      sources={turn.sources}
      proposal={
        offered
          ? {
              name: proposal.action.productName,
              // The server's price for the line; never multiplied or rounded here.
              price: proposal.action.unitPrice,
              quantity: proposal.action.quantity,
              category: product.data ? categoryOf(product.data) : null,
              image: product.data?.imageUrl ?? null,
            }
          : undefined
      }
      onConfirm={proposal?.state === 'offered' ? () => conversation.confirm(turn.id, proposal.action) : undefined}
      onDismiss={proposal?.state === 'offered' ? () => conversation.dismiss(turn.id) : undefined}
    >
      {turn.text}
    </AssistantMessage>
  )
}
