import { cx } from '../cx'
import { MARK } from './mark'
import './Logo.css'

export type LogoProps = {
  /** default 'full' */
  variant?: 'full' | 'mark'
  /** px, default 28 */
  height?: number
  className?: string
}

/** A shipping tag on a loose string, and the wordmark. Outlined, so it needs no font. */
export function Logo({ variant = 'full', height = 28, className }: LogoProps) {
  const width = variant === 'mark' ? 32 : 42 + MARK.width
  return (
    <svg
      className={cx('ed-logo', className)}
      viewBox={`0 0 ${width} 28`}
      height={height}
      width={(height * width) / 28}
      role="img"
      aria-label="EcomDemo"
    >
      <path className="ed-logo-brand" fillRule="evenodd" d={`${MARK.tag} ${MARK.hole}`} />
      <path className="ed-logo-string" d={MARK.string} fill="none" strokeWidth={1.3} strokeLinecap="round" />
      {variant === 'mark' ? null : (
        <g className="ed-logo-ink" transform={`translate(42 ${MARK.base})`}>
          <path d={MARK.ecom} />
          <path d={MARK.demo} />
        </g>
      )}
    </svg>
  )
}
