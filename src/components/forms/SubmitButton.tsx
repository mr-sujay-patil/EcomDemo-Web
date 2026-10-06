import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { Button } from '../Button'

/** The form's one primary button: it shows a spinner and is disabled while the submit runs (or while `disabled`, for a wait the page imposes). */
export function SubmitButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const { formState } = useFormContext()
  return (
    <Button type="submit" loading={formState.isSubmitting} disabled={disabled} block>
      {children}
    </Button>
  )
}
