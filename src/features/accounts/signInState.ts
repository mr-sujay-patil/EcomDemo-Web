/** What registration hands to the sign-in page through the router: the name to fill in, and that it was just made. */
export type SignInState = { registered: string }

export function signInStateFor(username: string): SignInState {
  return { registered: username }
}

/** Reads the router's `location.state`, which is `unknown`: anything but a username string is ignored. */
export function registeredUsername(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('registered' in state)) return null
  return typeof state.registered === 'string' && state.registered !== '' ? state.registered : null
}
