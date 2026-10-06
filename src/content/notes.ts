// Words a real person wrote for the shop. Never generated (CLAUDE.md rule 11): a note stays `null`, and is not
// shown at all, until the owner writes it.
export type Note = { text: string; name: string; role?: string; date?: string }

// TODO(owner): write the note shown when an order is confirmed (a sentence or two, in your voice), then replace
// `null` with { text: '…', name: 'Your name', role: 'Your role', date: '12 Sep 2026' }.
export const orderConfirmedNote: Note | null = null
