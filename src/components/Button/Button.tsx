import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonClass'
import './Button.css'

// `ref` is a plain prop in React 19: it reaches the <button> (a menu returns focus to its button with it).
export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  /** default 'primary'. One primary per view. */
  variant?: ButtonVariant
  /** default 'md' (40px); 'sm' is 32px */
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  /** Disables the button and shows a spinner; announced through `aria-busy`. */
  loading?: boolean
  block?: boolean
  /** Without children the button is icon-only: give it an `aria-label`. */
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  block,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : 18
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, iconOnly: !children, className })}
    >
      {loading ? <span className="ed-spinner" aria-hidden /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  )
}
