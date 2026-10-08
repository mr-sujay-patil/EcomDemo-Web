import { describe, expect, it } from 'vitest'
import { checkAudit } from './audit-deps.mjs'

const advisory = (name: string, id: string, severity = 'high') => ({
  source: 1,
  name,
  title: 'something bad',
  url: `https://github.com/advisories/${id}`,
  severity,
  range: '<1.0.0',
})
const report = (...entries: [string, ...(object | string)[]][]) => ({
  vulnerabilities: Object.fromEntries(entries.map(([name, ...via]) => [name, { via }])),
})
const reason = 'Reachable only through a dev tool that never runs on user input; no fix is published.'
const accept = (id: string, pkg: string, expires = '2026-12-31') => ({ id, package: pkg, reason, expires })

describe('audit-deps', () => {
  it('passes when nothing high is reported', () => {
    expect(
      checkAudit(report(['a', advisory('a', 'GHSA-low', 'low')]), { accepted: [] }, '2026-10-08').failures,
    ).toEqual([])
  })

  it('fails on a high advisory nobody accepted', () => {
    const { failures } = checkAudit(report(['tmp', advisory('tmp', 'GHSA-new')]), { accepted: [] }, '2026-10-08')

    expect(failures).toEqual([expect.stringContaining('GHSA-new')])
  })

  it('fails on a critical advisory too', () => {
    expect(
      checkAudit(report(['x', advisory('x', 'GHSA-crit', 'critical')]), { accepted: [] }, '2026-10-08').failures,
    ).toHaveLength(1)
  })

  it('accepts a listed advisory until its expiry date, and ignores packages that are only vulnerable through another', () => {
    const consequence = ['puppeteer-core', 'extract-zip'] // a string in `via`: a consequence, not a finding
    const { failures, accepted } = checkAudit(
      report(['extract-zip', advisory('extract-zip', 'GHSA-zip')], ['puppeteer-core', ...consequence]),
      { accepted: [accept('GHSA-zip', 'extract-zip')] },
      '2026-10-08',
    )

    expect(failures).toEqual([])
    expect(accepted).toEqual(['GHSA-zip'])
  })

  it('fails once an accepted advisory has expired', () => {
    const { failures } = checkAudit(
      report(['extract-zip', advisory('extract-zip', 'GHSA-zip')]),
      { accepted: [accept('GHSA-zip', 'extract-zip', '2026-10-07')] },
      '2026-10-08',
    )

    expect(failures).toEqual([expect.stringContaining('has passed')])
  })

  it('fails on an entry without a reason or an expiry date', () => {
    const { failures } = checkAudit(
      report(['extract-zip', advisory('extract-zip', 'GHSA-zip')]),
      { accepted: [{ id: 'GHSA-zip', package: 'extract-zip', reason: 'ok' }] },
      '2026-10-08',
    )

    expect(failures).toHaveLength(2)
  })

  it('fails on an entry npm no longer reports, so the list cannot rot', () => {
    const { failures } = checkAudit(report(), { accepted: [accept('GHSA-gone', 'tmp')] }, '2026-10-08')

    expect(failures).toEqual([expect.stringContaining('remove the entry')])
  })
})
