// What a person had typed into a form, kept in memory so a session that ends does not lose it: the page
// unmounts when the app sends them to sign in, and comes back with the draft when they return. Memory only, so
// a reload drops it, and a deliberate sign-out drops it on purpose (a shared computer must not keep it).
// Never put a password in a draft: `useFormDraft` takes the names to leave out.

export function createDraftStore() {
  const drafts = new Map<string, Record<string, unknown>>()
  return {
    get: (key: string) => drafts.get(key),
    set(key: string, values: Record<string, unknown>) {
      drafts.set(key, values)
    },
    delete(key: string) {
      drafts.delete(key)
    },
    clear() {
      drafts.clear()
    },
  }
}

export type DraftStore = ReturnType<typeof createDraftStore>
