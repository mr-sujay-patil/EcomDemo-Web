import type { Location } from 'react-router'

/**
 * Where to go after signing in, from `?next=`. Only a path on this site is accepted: it must start with one
 * slash and nothing that makes it another site (`//evil.example`, `/\evil.example`, `https://…`). Anything else,
 * and the sign-in and registration pages themselves (which would loop), is the home page.
 */
export function safeNext(raw: string | null): string {
  if (raw === null || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  const path = raw.split(/[?#]/)[0]
  return path === '/sign-in' || path === '/register' ? '/' : raw
}

/** The sign-in page's address for someone sent there from `location`: they come back to it afterwards. */
export function signInPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const here = `${location.pathname}${location.search}${location.hash}`
  return `/sign-in?next=${encodeURIComponent(here)}`
}
