import { Icon, type IconName } from '../Icon'
import { StatusBadge, type OrderStatus } from '../StatusBadge'
import './SagaTimeline.css'

export type SagaStep = 'placed' | 'stock' | 'payment' | 'confirmed'

const STEPS: { key: SagaStep; label: string; icon: IconName }[] = [
  { key: 'placed', label: 'Order placed', icon: 'package' },
  { key: 'stock', label: 'Stock reserved', icon: 'drive' },
  { key: 'payment', label: 'Payment taken', icon: 'check' },
  { key: 'confirmed', label: 'Confirmed', icon: 'truck' },
]

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

type StepState = 'done' | 'current' | 'failed' | 'todo' | 'skipped'

/** A packing slip with tick boxes. The words say what is happening; colour only backs them up. */
export function SagaTimeline({
  status = 'PENDING',
  current = 'stock',
  failedAt,
  reason,
  orderId,
  times = {},
}: SagaTimelineProps) {
  const indexOf = (key: SagaStep) => STEPS.findIndex((step) => step.key === key)
  const reached =
    status === 'CONFIRMED' ? STEPS.length : status === 'CANCELLED' ? indexOf(failedAt ?? 'stock') : indexOf(current)
  return (
    <section className="ed-saga" aria-label="Order progress">
      <header className="ed-saga-head">
        {orderId ? <span className="ed-id">{`Order #${orderId}`}</span> : null}
        <StatusBadge status={status} />
      </header>
      <ol className="ed-saga-steps">
        {STEPS.map((step, index) => {
          const state: StepState =
            index < reached
              ? 'done'
              : index === reached
                ? status === 'CANCELLED'
                  ? 'failed'
                  : 'current'
                : status === 'CANCELLED'
                  ? 'skipped'
                  : 'todo'
          const note =
            state === 'failed'
              ? reason
              : state === 'current'
                ? 'In progress…'
                : state === 'skipped'
                  ? 'Not reached'
                  : times[step.key]
          const icon: IconName =
            state === 'done' ? 'check' : state === 'failed' ? 'x' : state === 'current' ? 'clock' : step.icon
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
