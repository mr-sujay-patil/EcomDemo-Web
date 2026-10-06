import { useRef, type FormEvent, type ReactNode } from 'react'
import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import './forms.css'

export type FormProps<Values extends FieldValues> = {
  /** From `useForm`. The page owns it, so it can set server errors and read values. */
  form: UseFormReturn<Values>
  /** Runs only when every field is valid. May be async: the form counts as submitting until it settles. */
  onSubmit: SubmitHandler<Values>
  /** The form's accessible name: a form is only a landmark if it has one. */
  'aria-label': string
  children: ReactNode
}

/**
 * A form with the browser's own validation switched off (`noValidate`: the schema decides, in the store's
 * words) and two guarantees: the first invalid field gets focus on submit, and a second submit while the
 * first is still running is ignored, so one click or Enter never sends the request twice.
 */
export function Form<Values extends FieldValues>({ form, onSubmit, children, ...rest }: FormProps<Values>) {
  // A ref, not state: two Enter presses can arrive in the same tick, before any re-render.
  const running = useRef(false)
  const submit = form.handleSubmit(onSubmit)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    running.current = true
    void submit(event).finally(() => {
      running.current = false
    })
  }

  return (
    <FormProvider {...form}>
      <form className="ed-form" noValidate aria-label={rest['aria-label']} onSubmit={handleSubmit}>
        {children}
      </form>
    </FormProvider>
  )
}
