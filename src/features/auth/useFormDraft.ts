import { useEffect, useRef } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { useSessionContext } from './SessionProvider'

/**
 * Keeps what a person has typed into a form while the session ends under them. The values go to an in-memory
 * store as they change, come back when the form mounts again (after signing in, the page returns), and are
 * dropped by `clearDraft` (call it after a successful submit) or by a deliberate sign-out.
 *
 * @param key one per form, for example the route
 * @param leaveOut field names never kept: always a password
 */
export function useFormDraft<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  key: string,
  leaveOut: readonly string[] = [],
) {
  const { drafts } = useSessionContext()
  const { reset, getValues, watch } = form
  const skipped = useRef(leaveOut)

  // Once, on mount: put the saved values back over the defaults.
  useEffect(() => {
    const saved = drafts.get(key)
    if (saved) reset({ ...getValues(), ...saved })
  }, [drafts, key, reset, getValues])

  useEffect(() => {
    const subscription = watch((values) => {
      const kept = Object.fromEntries(Object.entries(values).filter(([name]) => !skipped.current.includes(name)))
      drafts.set(key, kept)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [drafts, key, watch])

  return {
    clearDraft: () => {
      drafts.delete(key)
    },
  }
}
