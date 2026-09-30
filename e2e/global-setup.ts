import { execFileSync } from 'node:child_process'

const gateway = process.env.API_TARGET ?? 'http://localhost:8080'

/** The tag the backend runs: BACKEND_TAG from the user, otherwise the read-only clone's. */
function backendTag(): string {
  if (process.env.BACKEND_TAG) return `${process.env.BACKEND_TAG} (from BACKEND_TAG)`
  try {
    const tag = execFileSync('git', ['-C', '../ecomdemo-backend-readonly', 'describe', '--tags'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return `${tag} (from ../ecomdemo-backend-readonly)`
  } catch {
    return 'unknown (set BACKEND_TAG, or clone the backend into ../ecomdemo-backend-readonly)'
  }
}

// Runs once before any test. Every spec needs the real backend, so a dead gateway ends the run
// here with one message instead of a wall of identical timeouts.
export default async function globalSetup() {
  const url = `${gateway}/api/products`
  let problem: string | null = null
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (response.status !== 200) problem = `answered ${response.status}`
  } catch (error) {
    // Node's fetch says only "fetch failed"; the cause names the real reason (ECONNREFUSED, a timeout).
    const reason = error instanceof Error && error.cause instanceof Error ? error.cause : error
    problem = `did not answer (${reason instanceof Error ? reason.message : String(reason)})`
  }

  if (problem) {
    const error = new Error(
      `The backend is not reachable: GET ${url} ${problem}.\n` +
        '  Start the backend stack at the pinned tag (docs/process/development-environment.md), then rerun npm run e2e.',
    )
    // The stack trace would only point at this file; the message is the whole story.
    error.stack = error.message
    throw error
  }

  console.log(`Backend: ${gateway} answers GET /api/products 200; tag ${backendTag()}`)
}
