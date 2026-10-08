// Prints the median of the Lighthouse CI runs in .lighthouseci/ for each page, as a table (and as perf-results/lighthouse.md).
// `node scripts/perf-report.mjs [label]`: the label goes in the file name, so a before and an after can sit side by side.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const dir = '.lighthouseci'
const label = process.argv[2] ?? 'run'

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const runs = readdirSync(dir)
  .filter((name) => name.startsWith('lhr-') && name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(`${dir}/${name}`, 'utf8')))

const pages = new Map()
for (const run of runs) {
  const path = new URL(run.finalDisplayedUrl).pathname
  pages.set(path, [...(pages.get(path) ?? []), run])
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`
const rows = []
for (const [path, group] of pages) {
  const size = (kind) =>
    median(
      group.map(
        (run) =>
          run.audits['resource-summary'].details.items.find((item) => item.resourceType === kind)?.transferSize ?? 0,
      ),
    )
  rows.push({
    path,
    runs: group.length,
    score: median(group.map((run) => run.categories.performance.score * 100)),
    fcp: median(group.map((run) => run.audits['first-contentful-paint'].numericValue)),
    lcp: median(group.map((run) => run.audits['largest-contentful-paint'].numericValue)),
    tbt: median(group.map((run) => run.audits['total-blocking-time'].numericValue)),
    cls: median(group.map((run) => run.audits['cumulative-layout-shift'].numericValue)),
    script: size('script'),
    font: size('font'),
    total: size('total'),
  })
}

const lines = [
  `Lighthouse, mobile, simulated slow 4G and 4x CPU; median of the runs per page (${label})`,
  '',
  '| Page | Runs | Performance | FCP | LCP | TBT | CLS | JavaScript | Fonts | Everything |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (row) =>
      `| ${row.path} | ${row.runs} | ${row.score} | ${(row.fcp / 1000).toFixed(2)} s | ${(row.lcp / 1000).toFixed(2)} s | ${Math.round(row.tbt)} ms | ${row.cls.toFixed(3)} | ${kb(row.script)} | ${kb(row.font)} | ${kb(row.total)} |`,
  ),
]
console.log(lines.join('\n'))
mkdirSync('perf-results', { recursive: true })
writeFileSync(`perf-results/lighthouse-${label}.md`, `${lines.join('\n')}\n`)
