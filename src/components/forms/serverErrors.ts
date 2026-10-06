import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { ApiError } from '@/api/errors'
import { splitFieldErrors } from '@/api/fieldErrors'

/** The words for a failure that is not about one field, or a generic sentence when it is not even an `ApiError`. */
const GENERIC = 'Something went wrong. Try again in a moment.'

/**
 * Puts the backend's rejection where the person can fix it. A 400's message lists every rejected field
 * ("fullName must not be blank; password must be between 8 and 72 characters"): each part goes on its own
 * field, in the field's label instead of its key, and the top-most of them gets focus. Whatever is left (a
 * part naming no field, or any other status) is returned for a `FormError`; null means nothing is left.
 *
 * @param labels the form's field names and what the person calls them: `{ fullName: 'Full name' }`
 */
export function applyServerErrors<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  error: unknown,
  labels: Record<string, string>,
): string | null {
  if (!(error instanceof ApiError)) return GENERIC
  if (error.status !== 400) return error.message

  const { fields, other } = splitFieldErrors(error.message, Object.keys(labels))
  // In the form's own order, not the message's (the backend lists fields alphabetically): the top-most
  // rejected field gets focus.
  let first = true
  for (const [name, label] of Object.entries(labels)) {
    const text = fields[name]
    if (text === undefined) continue
    form.setError(
      name as Path<Values>,
      { type: 'server', message: `${label}${text.slice(name.length)}` },
      { shouldFocus: first },
    )
    first = false
  }
  return other.length > 0 ? other.join('; ') : null
}
