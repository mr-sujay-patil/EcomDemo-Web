// npm run api:snapshot | api:generate | api:check
//
// The backend's contract is its OpenAPI documents. A snapshot of each is committed under
// api/openapi/, the TypeScript types are generated from the snapshots, and `check` compares the
// live backend with the snapshots, so a backend change cannot slip in unseen.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { findDrift, formatDocument, services, type Drift, type Service } from './openapi.ts'

const gateway = process.env.API_TARGET ?? 'http://localhost:8080'
const snapshotPath = (service: Service) => `api/openapi/${service}.json`
const generatedPath = (service: Service) => `src/api/generated/${service}.ts`

async function fetchDocument(service: Service): Promise<unknown> {
  const url = `${gateway}/v3/api-docs/${service}`
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  } catch (error) {
    const reason = error instanceof Error && error.cause instanceof Error ? error.cause : error
    throw new Error(
      `Cannot reach ${url} (${reason instanceof Error ? reason.message : String(reason)}).\n` +
        '  Start the backend stack at the pinned tag (docs/process/development-environment.md).',
    )
  }
  if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`)
  return response.json()
}

/** Fetches all five before anyone writes or compares, so a half-reachable backend changes nothing. */
async function fetchAll(): Promise<Map<Service, unknown>> {
  const documents = await Promise.all(services.map(async (service) => [service, await fetchDocument(service)] as const))
  return new Map(documents)
}

async function snapshot() {
  const documents = await fetchAll()
  mkdirSync('api/openapi', { recursive: true })
  for (const [service, document] of documents) {
    writeFileSync(snapshotPath(service), formatDocument(document))
    console.log(`wrote ${snapshotPath(service)}`)
  }
}

function generate() {
  mkdirSync('src/api/generated', { recursive: true })
  for (const service of services) {
    if (!existsSync(snapshotPath(service))) {
      throw new Error(`${snapshotPath(service)} is missing: run npm run api:snapshot first`)
    }
    execFileSync('node_modules/.bin/openapi-typescript', [snapshotPath(service), '-o', generatedPath(service)], {
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    console.log(`generated ${generatedPath(service)}`)
  }
}

async function check() {
  const documents = await fetchAll()
  const drifts: Drift[] = []
  for (const [service, document] of documents) {
    const committed = existsSync(snapshotPath(service)) ? readFileSync(snapshotPath(service), 'utf8') : null
    const drift = findDrift(service, committed, document)
    if (drift) drifts.push(drift)
  }
  if (drifts.length === 0) {
    console.log(`api:check: the live backend at ${gateway} matches all ${services.length} snapshots`)
    return
  }
  for (const { service, problem } of drifts)
    console.error(`api:check: ${service} differs from ${snapshotPath(service)}: ${problem}`)
  console.error(
    '\nThe backend changed, or the snapshots are stale. If the change is expected: npm run api:snapshot && npm run api:generate,\n' +
      'review the diff, and commit it as `chore(api): regenerate from backend <tag>`. If not, ask the backend team.',
  )
  process.exitCode = 1
}

const commands: Record<string, () => void | Promise<void>> = { snapshot, generate, check }
const command = process.argv[2] ?? ''
const run = commands[command]
if (!run) {
  console.error(`Usage: node scripts/api.ts <${Object.keys(commands).join('|')}>`)
  process.exit(2)
}
try {
  await run()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
