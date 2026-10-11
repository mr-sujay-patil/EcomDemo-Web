import { Icon } from '../Icon'
import { StatusBadge, type OrderStatus } from '../StatusBadge'
import { reachedIndex, STEPS, stepIcon, stepNote, stepState, type SagaStep } from './steps'
import './SagaTimeline.css'

export type { SagaStep } from './steps'

export type SagaTimelineProps = {
  status?: OrderStatus
  /** The step in progress while PENDING. */
  current?: SagaStep
  /** The step that failed when CANCELLED. */
  failedAt?: SagaStep
  /** The reason the order API keeps. */
  reason?: string
  orderId?: string | number
  times?: Partial<Record<SagaStep, string>>
}

/** A packing slip with tick boxes. The words say what is happening; colour only backs them up. */
export function SagaTimeline({
  status = 'PENDING',
  current = 'stock',
  failedAt,
  reason,
  orderId,
  times = {},
}: Readonly<SagaTimelineProps>) {
  const reached = reachedIndex(status, current, failedAt)
  return (
    <section className="ed-saga" aria-label="Order progress">
      <header className="ed-saga-head">
        {orderId ? <span className="ed-id">{`Order #${orderId}`}</span> : null}
        <StatusBadge status={status} />
      </header>
      <ol className="ed-saga-steps">
        {STEPS.map((step, index) => {
          const state = stepState(index, reached, status)
          const note = stepNote(state, reason, times[step.key])
          const icon = stepIcon(state, step.icon)
          return (
            <li key={step.key} className={`ed-step is-${state}`}>
              <span className="ed-step-dot">
                <Icon name={icon} size={16} />
              </span>
              <span className="ed-step-text">
                <span className="ed-step-label">{step.label}</span>
                {note ? <span className="ed-step-note">{note}</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
