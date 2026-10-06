import { cx } from '../cx'
import { ICONS, type IconName } from './icons'
import './Icon.css'

export type IconProps = {
  name: IconName
  /** px, default 20 */
  size?: number
  /** Set to make the icon meaningful; omit for a decorative one (hidden from screen readers). */
  label?: string
  className?: string
}

export function Icon({ name, size = 20, label, className }: IconProps) {
  return (
    <svg
      className={cx('ed-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // The markup is the static ICONS table in this folder, never user input.
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
