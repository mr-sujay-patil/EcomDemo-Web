// The CPU slowdown that makes THIS machine simulate the same phone as every other machine (web KI-027).
//
// Lighthouse's simulated throttling measures how long the page's CPU work took here and multiplies it by
// `cpuSlowdownMultiplier`. Its benchmark index (computeBenchmarkIndex, run on every Lighthouse run and kept in each report as
// `environment.benchmarkIndex`) counts how many times per second the machine repeats a fixed piece of work, so that work's time
// is proportional to 1 / index. The phone being simulated therefore has the index `machine index / slowdown`, and a constant 4x
// simulates a different phone on every machine: on the reference desktop (index about 4400) a phone of 1100, on a CI runner
// (about 2345) a phone of about 590, nearly twice as slow. That is why the same build measured 2.40 s here and 2.89 s in CI.
//
// The fix holds the phone fixed instead: slowdown = machine index / 1100, the phone of the reference desktop at 4x, where the
// Phase 21 budgets (LCP 2.5 s and the rest) were set and every number in docs/performance.md was measured. On the reference
// machine nothing changes (4x); a CI runner gets about 2.1x. Lighthouse's own throttling guide (docs/throttling.md) says the
// same in words: the default 4x assumes a typical desktop, a machine outside that range should calibrate, and its calculator
// derives the multiplier from this benchmark. Its device table calls an index of 800 to 1200 "high-end mobile".
//
// `node scripts/perf-calibrate.mjs` benchmarks this machine with Lighthouse's own function, in the Chrome Lighthouse will use
// (CHROME_PATH), five times, each in a freshly started Chrome as a Lighthouse run does, and prints the slowdown for the median. scripts/perf.sh passes it to lighthouserc.cjs.
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** The machine the budgets were set on (docs/performance.md, "Method") and the slowdown it used. */
export const REFERENCE = { benchmarkIndex: 4400, cpuSlowdownMultiplier: 4 }
/** The phone every machine simulates: the reference desktop at 4x. */
export const TARGET_BENCHMARK_INDEX = REFERENCE.benchmarkIndex / REFERENCE.cpuSlowdownMultiplier
/** The top of the range Lighthouse documents for its multiplier (docs/throttling.md: "10x (5-20)"). */
export const MAX_CPU_SLOWDOWN = 20

/** The middle value (the mean of the two middle ones for an even count). */
export function median(values) {
  if (values.length === 0) throw new Error('median of nothing')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * The slowdown for a machine with this benchmark index, to two decimals: index / target, never below 1x (a machine slower than
 * the phone cannot be sped up; its numbers are pessimistic, and it should say so) and never above 20x.
 */
export function cpuSlowdownFor(benchmarkIndex, target = TARGET_BENCHMARK_INDEX) {
  if (!Number.isFinite(benchmarkIndex) || benchmarkIndex <= 0)
    throw new Error(`A benchmark index must be a positive number, got ${benchmarkIndex}`)
  const exact = benchmarkIndex / target
  return Math.min(MAX_CPU_SLOWDOWN, Math.max(1, Math.round(exact * 100) / 100))
}

/**
 * Each Lighthouse run benchmarks the machine again, after the slowdown was fixed: the phone it actually simulated is its own
 * index / the slowdown. Returns those phones (rounded) and the largest relative drift from the target, signed.
 */
export function driftFromTarget(benchmarkIndexes, multiplier, target = TARGET_BENCHMARK_INDEX) {
  const exact = benchmarkIndexes.map((index) => index / multiplier)
  const worst = exact.map((phone) => (phone - target) / target).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)
  return { simulated: exact.map((phone) => Math.round(phone)), worst }
}

const BENCHMARK_RUNS = 5

/**
 * Lighthouse's own benchmark, from the Lighthouse that Lighthouse CI runs (not a copy), measured the way a Lighthouse run measures
 * it: once, in a Chrome that has just started (headless, the same flags as lighthouserc.cjs). A Chrome that has warmed up scores
 * higher: on CI the first reading in a fresh Chrome was 2190 and the next four in the same one 2531 to 2657, while the Lighthouse
 * runs themselves measured 2172 to 2232, so a warm median simulated a phone 16% slower than the target. Each sample is a new Chrome.
 */
async function benchmarkThisMachine(chromePath) {
  const fromLhci = createRequire(createRequire(import.meta.url).resolve('@lhci/cli/package.json'))
  const { pageFunctions } = await import(pathToFileURL(fromLhci.resolve('lighthouse/core/lib/page-functions.js')).href)
  const { default: puppeteer } = await import('puppeteer-core')
  const indexes = []
  for (let run = 0; run < BENCHMARK_RUNS; run += 1) {
    const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] })
    try {
      const page = await browser.newPage()
      indexes.push(await page.evaluate(pageFunctions.computeBenchmarkIndex))
    } finally {
      await browser.close()
    }
  }
  return indexes
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const chromePath = process.env.CHROME_PATH
  if (!chromePath) throw new Error('CHROME_PATH must point at a Chrome or Chromium binary.')
  const indexes = await benchmarkThisMachine(chromePath)
  const index = median(indexes)
  const multiplier = cpuSlowdownFor(index)
  // The explanation goes to stderr, the number alone to stdout (perf.sh reads it).
  console.error(
    `CPU calibration: Lighthouse benchmark index ${indexes.map(Math.round).join(', ')} (median ${Math.round(index)}); ` +
      `slowdown ${multiplier}x simulates a phone of ${Math.round(index / multiplier)} (target ${TARGET_BENCHMARK_INDEX}).`,
  )
  if (index < TARGET_BENCHMARK_INDEX)
    console.error('This machine is slower than the simulated phone: it runs at 1x and its numbers are pessimistic.')
  console.log(multiplier)
}
