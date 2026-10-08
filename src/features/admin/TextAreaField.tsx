import { useId, type ComponentPropsWithoutRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { cx } from '@/components/cx'
import { Icon } from '@/components/Icon'

type Props = Omit<ComponentPropsWithoutRef<'textarea'>, 'name'> & { name: string; label: string; hint?: string }

/** A multi-line field bound to the surrounding `Form`, in the same box, label and note as `TextField`. */
export function TextAreaField({ name, label, hint, rows = 6, ...rest }: Props) {
  const { register, formState } = useFormContext()
  const id = useId()
  const message = formState.errors[name]?.message
  const error = typeof message === 'string' ? message : undefined
  const note = error ?? hint
  return (
    <div className={cx('ed-field', error && 'has-error')}>
      <label className="ed-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="ed-field-box">
        <textarea
          id={id}
          rows={rows}
          className="ed-field-input admin-textarea"
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          {...rest}
          {...register(name)}
        />
      </div>
      {note ? (
        <p id={`${id}-note`} className="ed-field-note">
          {error ? <Icon name="alert" size={14} /> : null}
          {note}
        </p>
      ) : null}
    </div>
  )
}
