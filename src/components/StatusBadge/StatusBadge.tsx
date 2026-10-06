import type { ReactNode } from 'react'
import type { components } from '@/api/generated/app'
import { cx } from '../cx'
import { Icon, type IconName } from '../Icon'
import './StatusBadge.css'

/** Exactly as the order API returns it. */
export type OrderStatus = components['schemas']['OrderResponse']['status']
export type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'danger'

const STATUS: Record<OrderStatus, { tone: Tone; label: string; icon: IconName }> = {
  PENDING: { tone: 'accent', label: 'Pending', icon: 'clock' },
  CONFIRMED: { tone: 'success', label: 'Confirmed', icon: 'check' },
  CANCELLED: { tone: 'danger', label: 'Cancelled', icon: 'x' },
}

export type StatusBadgeProps = { status?: OrderStatus; tone?: Tone; children?: ReactNode }

/** A printed label. It always carries a word and an icon, never colour alone. */
export function StatusBadge({ status, tone, children }: StatusBadgeProps) {
  const known = status ? STATUS[status] : undefined
  return (
    <span className={cx('ed-badge', `ed-badge--${tone ?? known?.tone ?? 'neutral'}`)}>
      {known ? <Icon name={known.icon} size={14} /> : null}
      {children ?? known?.label}
    </span>
  )
}
