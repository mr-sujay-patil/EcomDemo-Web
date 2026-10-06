import { z } from 'zod'

// The rules the backend enforces on accounts (integration guide, sections 3, 6 and 7; backend
// `RegisterRequest`, `LoginRequest`, `UpdateProfileRequest`). They run in the browser for speed: the
// backend checks again and its answer is the truth, so a rule that drifts is caught by the server and shown
// on the field (`applyServerErrors`). The words are the store's: say what to do, never "Invalid input".

export const USERNAME_MIN = 3
export const USERNAME_MAX = 50
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
export const FULL_NAME_MAX = 100

/** Letters, digits, dot, underscore, hyphen. */
const usernamePattern = /^[a-zA-Z0-9._-]+$/

const username = z
  .string()
  .min(1, 'Choose a username.')
  .min(USERNAME_MIN, `Use at least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `Use at most ${USERNAME_MAX} characters.`)
  .regex(usernamePattern, 'Use letters, digits, dots, underscores and hyphens only.')

// Length is the only password rule (no symbols or digits required). Spaces are allowed, but a password of
// nothing but spaces is blank to the backend, so it is here too. The password is never trimmed.
const password = z
  .string()
  .min(1, 'Choose a password.')
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)
  .refine((value) => value.trim() !== '', 'A password cannot be only spaces.')

// A name with stray spaces round the edges is noise: it is trimmed, and the trimmed name is what is sent.
const fullName = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(FULL_NAME_MAX, `Use at most ${FULL_NAME_MAX} characters.`)

export const registerSchema = z.object({ username, password, fullName })
export type RegisterValues = z.infer<typeof registerSchema>

// Sign-in only asks that both are filled in: whether they are right is the server's to say, and it says it
// the same way for a wrong password and an unknown username, on purpose.
export const loginSchema = z.object({
  username: z.string().refine((value) => value.trim() !== '', 'Enter your username.'),
  password: z.string().refine((value) => value.trim() !== '', 'Enter your password.'),
})
export type LoginValues = z.infer<typeof loginSchema>

/** `PUT /api/customers/me` (the profile page arrives in Phase 14). */
export const profileSchema = z.object({ fullName })
export type ProfileValues = z.infer<typeof profileSchema>

/** What a person calls each field, for server messages that name it (`applyServerErrors`). */
export const registerLabels = { username: 'Username', password: 'Password', fullName: 'Full name' } as const
