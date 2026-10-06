import { cx } from '../cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

/** The classes of a button, for the things that must be a link (`<Link className={buttonClass(...)}>`). */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  block,
  iconOnly,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  iconOnly?: boolean
  className?: string
} = {}): string {
  return cx(
    'ed-btn',
    `ed-btn--${variant}`,
    `ed-btn--${size}`,
    block && 'ed-btn--block',
    iconOnly && 'ed-btn--icon',
    className,
  )
}
