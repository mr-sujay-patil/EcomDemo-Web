import type { IconName } from '../Icon'
import type { OrderStatus } from '../StatusBadge'

export type SagaStep = 'placed' | 'stock' | 'payment' | 'confirmed'

export const STEPS: { key: SagaStep; label: string; icon: IconName }[] = [
  { key: 'placed', label: 'Order placed', icon: 'package' },
  { key: 'stock', label: 'Stock reserved', icon: 'drive' },
  { key: 'payment', label: 'Payment taken', icon: 'check' },
  { key: 'confirmed', label: 'Confirmed', icon: 'truck' },
]

export type StepState = 'done' | 'current' | 'failed' | 'todo' | 'skipped'

const indexOf = (key: SagaStep) => STEPS.findIndex((step) => step.key === key)

/** How many steps are behind the order: all of them once CONFIRMED, else up to the failed or current step. */
export function reachedIndex(status: OrderStatus, current: SagaStep, failedAt: SagaStep | undefined): number {
  if (status === 'CONFIRMED') return STEPS.length
  if (status === 'CANCELLED') return indexOf(failedAt ?? 'stock')
  return indexOf(current)
}

/** A step before the reached one is done; the reached one failed (CANCELLED) or is under way; the rest wait or never come. */
export function stepState(index: number, reached: number, status: OrderStatus): StepState {
  const cancelled = status === 'CANCELLED'
  if (index < reached) return 'done'
  if (index === reached) return cancelled ? 'failed' : 'current'
  return cancelled ? 'skipped' : 'todo'
}

/** The small line under a step's label: the reason it failed, that it is under way, that it was never reached, or its time. */
export function stepNote(state: StepState, reason: string | undefined, time: string | undefined): string | undefined {
  switch (state) {
    case 'failed':
      return reason
    case 'current':
      return 'In progress…'
    case 'skipped':
      return 'Not reached'
    default:
      return time
  }
}

/** The tick box: a tick, a cross or a clock for a step with an outcome, the step's own icon otherwise. */
export function stepIcon(state: StepState, own: IconName): IconName {
  switch (state) {
    case 'done':
      return 'check'
    case 'failed':
      return 'x'
    case 'current':
      return 'clock'
    default:
      return own
  }
}
