import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Icon } from '../Icon'
import './Chip.css'

export type ChipProps = { selected?: boolean; count?: number; onClick?: () => void; children: ReactNode }

/** A filter tag, not a pill. A toggle button: `aria-pressed` says whether it is on. */
export function Chip({ selected, count, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      className={cx('ed-chip', selected && 'is-selected')}
      aria-pressed={!!selected}
      onClick={onClick}
    >
      {selected ? <Icon name="check" size={14} /> : null}
      <span>{children}</span>
      {/* A real space, so the accessible name reads "Audio 7", not "Audio7" (the flex layout ignores it). */}
      {count != null ? (
        <>
          {' '}
          <span className="ed-chip-count">{count}</span>
        </>
      ) : null}
    </button>
  )
}
