// `npm audit`, with a written exception list. Fails on any HIGH or CRITICAL advisory in the dependency tree unless
// audit-allowlist.json accepts it with a reason and an expiry date; an expired or unused entry fails too, so the list cannot rot.
// Plain `npm audit --audit-level=high` has no way to say "known, not reachable, revisit by <date>"; this is that.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const blocking = new Set(['high', 'critical'])

/**
 * `report` is the JSON of `npm audit --json`; `allowlist` is audit-allowlist.json; `today` is 'YYYY-MM-DD'.
 * Only advisories count (the `via` objects): a package that is merely vulnerable *through* another is a consequence, not a finding.
 */
export function checkAudit(report, allowlist, today) {
  const accepted = new Map((allowlist.accepted ?? []).map((entry) => [entry.id, entry]))
  const failures = []
  const used = new Set()
  const seen = new Set()
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
      if (typeof via === 'string' || !blocking.has(via.severity)) continue
      const id = via.url?.split('/').pop() ?? String(via.source)
      if (seen.has(`${name}:${id}`)) continue
      seen.add(`${name}:${id}`)
      const entry = accepted.get(id)
      if (!entry) {
        failures.push(
          `${name}: ${via.severity} ${id} "${via.title}" (range ${via.range}) is not accepted; update the package or add a justified entry`,
        )
      } else {
        used.add(id)
        if (entry.package !== via.name)
          failures.push(`${id} is listed for ${entry.package} but npm reports it on ${via.name}`)
        if (!entry.reason || entry.reason.length < 40)
          failures.push(`${id}: the allowlist entry needs a written reason`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expires ?? ''))
          failures.push(`${id}: the allowlist entry needs an expiry date (YYYY-MM-DD)`)
        else if (entry.expires < today)
          failures.push(
            `${id} (${name}): accepted until ${entry.expires}, which has passed; fix it or renew the entry on purpose`,
          )
      }
    }
  }
  for (const id of accepted.keys()) {
    if (!used.has(id)) failures.push(`${id} is in the allowlist but npm no longer reports it; remove the entry`)
  }
  return { failures, accepted: [...used] }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let output
  try {
    output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    // npm audit exits 1 when it finds anything; the report is still on stdout. No report (offline, registry down) is a failure.
    output = error.stdout
    if (!output) {
      console.error(`audit-deps: npm audit gave no report (${error.message})`)
      process.exit(1)
    }
  }
  const report = JSON.parse(output)
  if (report.error) {
    console.error(`audit-deps: npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`)
    process.exit(1)
  }
  const allowlist = JSON.parse(readFileSync('audit-allowlist.json', 'utf8'))
  const { failures, accepted } = checkAudit(report, allowlist, new Date().toISOString().slice(0, 10))
  const total = report.metadata?.vulnerabilities ?? {}
  console.log(
    `audit-deps: ${total.high ?? 0} high and ${total.critical ?? 0} critical packages reported, ${accepted.length} advisories accepted (audit-allowlist.json).`,
  )
  if (failures.length > 0) {
    for (const failure of failures) console.error(`audit-deps: ${failure}`)
    process.exit(1)
  }
}
