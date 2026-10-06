import type { ReactNode } from 'react'
import { formatPrice } from '@/lib/money'
import { cx } from '../cx'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { ProductTile } from '../ProductTile'
import '../CartLine/CartLine.css'
import './AssistantMessage.css'

export type AssistantMessageProps = {
  role?: 'assistant' | 'user'
  children: ReactNode
  /** A product the assistant suggests. The cart API is called only when the customer presses "Add it". */
  proposal?: { name: string; category?: string | null; image?: string | null; price: number; quantity?: number }
  /** What the assistant looked at. */
  sources?: string[]
  onConfirm?: () => void
  onDismiss?: () => void
}

export function AssistantMessage({
  role = 'assistant',
  children,
  proposal,
  sources,
  onConfirm,
  onDismiss,
}: AssistantMessageProps) {
  const mine = role === 'user'
  return (
    <div className={cx('ed-msg', mine ? 'is-user' : 'is-assistant')}>
      <div className="ed-msg-bubble">
        {mine ? null : (
          <p className="ed-msg-who">
            <Icon name="chat" size={14} />
            Shop assistant
          </p>
        )}
        <div className="ed-msg-text">{children}</div>
        {proposal ? (
          <div className="ed-proposal">
            <ProductTile category={proposal.category} image={proposal.image} size="sm" />
            <div className="ed-proposal-main">
              <p className="ed-cartline-name">{proposal.name}</p>
              <p className="ed-caption">
                <span className="ed-mono">{formatPrice(proposal.price)}</span>
                {` · add ${proposal.quantity ?? 1} to your cart?`}
              </p>
            </div>
            <div className="ed-proposal-actions">
              <Button size="sm" onClick={onConfirm}>
                Add it
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Not now
              </Button>
            </div>
          </div>
        ) : null}
        {sources?.length ? <p className="ed-msg-sources">Checked: {sources.join(', ')}</p> : null}
      </div>
    </div>
  )
}
