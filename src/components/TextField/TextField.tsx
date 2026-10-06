import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cx } from '../cx'
import { Icon, type IconName } from '../Icon'
import './TextField.css'

// `ref` is a plain prop in React 19: it goes to the <input>, which is how a form library focuses the first invalid field.
export type TextFieldProps = ComponentPropsWithRef<'input'> & {
  label?: string
  hint?: string
  /** Replaces the hint, turns the field red and sets `aria-invalid`. Say what to do, not just what is wrong. */
  error?: string
  icon?: IconName
  /** A control inside the box, after the input, such as a Show/Hide password button. */
  trailing?: ReactNode
}

export function TextField({ label, hint, error, icon, trailing, id, ...rest }: TextFieldProps) {
  const auto = useId()
  const fieldId = id ?? auto
  const note = error ?? hint
  return (
    <div className={cx('ed-field', error && 'has-error')}>
      {label ? (
        <label className="ed-field-label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <div className="ed-field-box">
        {icon ? <Icon name={icon} size={18} /> : null}
        <input
          id={fieldId}
          className="ed-field-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${fieldId}-note` : undefined}
          {...rest}
        />
        {trailing ? <span className="ed-field-trailing">{trailing}</span> : null}
      </div>
      {note ? (
        <p id={`${fieldId}-note`} className="ed-field-note">
          {error ? <Icon name="alert" size={14} /> : null}
          {note}
        </p>
      ) : null}
    </div>
  )
}
