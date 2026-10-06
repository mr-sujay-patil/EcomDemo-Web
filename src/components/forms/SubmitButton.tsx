import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { Button } from '../Button'

/** The form's one primary button: it shows a spinner and is disabled while the submit runs. */
export function SubmitButton({ children }: { children: ReactNode }) {
  const { formState } = useFormContext()
  return (
    <Button type="submit" loading={formState.isSubmitting} block>
      {children}
    </Button>
  )
}
