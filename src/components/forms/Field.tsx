import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Button } from '../Button'
import { TextField, type TextFieldProps } from '../TextField'

export type FieldProps = Omit<
  TextFieldProps,
  'name' | 'error' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'ref'
> & {
  /** The key in the form's values. */
  name: string
  label: string
  /** For a password: adds a Show/Hide button that switches the input between `password` and `text`. */
  revealable?: boolean
}

/**
 * A `TextField` bound to the surrounding `Form`: its error comes from the schema (or the server) and is
 * linked to the input with `aria-invalid` and `aria-describedby`; validation runs on blur, then on every
 * change once touched.
 */
export function Field({ name, type = 'text', revealable, ...rest }: FieldProps) {
  const { register, formState } = useFormContext()
  const [shown, setShown] = useState(false)
  const message = formState.errors[name]?.message
  return (
    <TextField
      {...rest}
      {...register(name)}
      type={revealable && shown ? 'text' : type}
      error={typeof message === 'string' ? message : undefined}
      trailing={
        revealable ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${shown ? 'Hide' : 'Show'} ${rest.label.toLowerCase()}`}
            onClick={() => {
              setShown((value) => !value)
            }}
          >
            {shown ? 'Hide' : 'Show'}
          </Button>
        ) : undefined
      }
    />
  )
}
