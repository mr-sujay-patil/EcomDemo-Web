/**
 * A 400's `message` lists every rejected field, joined with "; ", each part starting with the
 * field's name: "fullName must not be blank; password must be between 8 and 72 characters"
 * (integration guide, section 4). This splits it so a form can put each sentence beside its field.
 * A part that starts with none of `fields` goes to `other`, for a message above the form.
 */
export function splitFieldErrors<Field extends string>(
  message: string,
  fields: readonly Field[],
): { fields: Partial<Record<Field, string>>; other: string[] } {
  const byField: Partial<Record<Field, string>> = {}
  const other: string[] = []
  for (const part of message.split('; ')) {
    const text = part.trim()
    if (text === '') continue
    // The name must end at a word boundary: "pass" must not claim "password must ...".
    const field = fields.find((name) => text === name || text.startsWith(`${name} `))
    if (field === undefined) {
      other.push(text)
    } else {
      const earlier = byField[field]
      byField[field] = earlier === undefined ? text : `${earlier}; ${text}`
    }
  }
  return { fields: byField, other }
}
