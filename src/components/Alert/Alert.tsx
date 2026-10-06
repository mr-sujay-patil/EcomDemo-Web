import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Button } from '../Button'
import { Icon, type IconName } from '../Icon'
import './Alert.css'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const ALERT_ICON: Record<Tone, IconName> = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' }

export type AlertProps = { tone?: Tone; title?: string; children?: ReactNode; onClose?: () => void }

/** `danger` is announced at once (`role="alert"`); the others politely (`role="status"`). */
export function Alert({ tone = 'info', title, children, onClose }: AlertProps) {
  return (
    <div className={cx('ed-alert', `ed-alert--${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICON[tone]} size={20} />
      <div className="ed-alert-body">
        {title ? <p className="ed-alert-title">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {onClose ? <Button variant="ghost" size="sm" icon="x" aria-label="Dismiss" onClick={onClose} /> : null}
    </div>
  )
}
