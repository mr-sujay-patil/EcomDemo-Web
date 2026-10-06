import { useState } from 'react'
import { Icon } from '../Icon'
import './QuantityStepper.css'

export type QuantityStepperProps = {
  /** Controlled: the parent owns the number. Leave it out and the stepper keeps its own. */
  value?: number
  defaultValue?: number
  /** default 1 */
  min?: number
  /** default 99 */
  max?: number
  onChange?: (next: number) => void
  /** The group's accessible name, default "Quantity". Name the product in a list: "Quantity of Mechanical Keyboard". */
  label?: string
}

export function QuantityStepper({
  value,
  defaultValue = 1,
  min = 1,
  max = 99,
  onChange,
  label = 'Quantity',
}: QuantityStepperProps) {
  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  function set(next: number) {
    const clamped = Math.max(min, Math.min(max, next))
    if (value === undefined) setInner(clamped)
    onChange?.(clamped)
  }
  return (
    <div className="ed-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => set(current - 1)} disabled={current <= min} aria-label="Decrease">
        <Icon name="minus" size={16} />
      </button>
      <output aria-live="polite">{current}</output>
      <button type="button" onClick={() => set(current + 1)} disabled={current >= max} aria-label="Increase">
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}
