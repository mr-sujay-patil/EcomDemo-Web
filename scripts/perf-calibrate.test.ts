import { describe, expect, it } from 'vitest'
import {
  cpuSlowdownFor,
  driftFromTarget,
  median,
  MAX_CPU_SLOWDOWN,
  REFERENCE,
  TARGET_BENCHMARK_INDEX,
} from './perf-calibrate.mjs'

// Lighthouse's simulation measures how long the page's CPU work took on this machine and multiplies it by the slowdown.
// Its benchmark index counts how many times per second the machine repeats a fixed piece of work, so the work's time is
// proportional to 1 / index, and "the phone" the test stands for has the index `machine index / slowdown`. Holding that
// quotient fixed is what makes a fast desktop and a slower CI runner judge the same phone.

describe('perf-calibrate: the CPU slowdown for this machine', () => {
  it('simulates the phone the budgets were set on: the reference desktop at 4x, about index 1100', () => {
    expect(REFERENCE).toEqual({ benchmarkIndex: 4400, cpuSlowdownMultiplier: 4 })
    expect(TARGET_BENCHMARK_INDEX).toBe(1100)
  })

  it('changes nothing on the reference machine: 4x, as before the fix', () => {
    expect(cpuSlowdownFor(4400)).toBe(4)
  })

  it('slows a CI runner (index about 2345) less, so it simulates the same phone, not a slower one', () => {
    const multiplier = cpuSlowdownFor(2345)

    expect(multiplier).toBe(2.13)
    expect(2345 / multiplier).toBeCloseTo(TARGET_BENCHMARK_INDEX, -1)
  })

  it('gives every machine the same simulated phone, within the rounding', () => {
    for (const index of [1200, 1700, 2342.5, 3100, 4400, 6000]) {
      expect(index / cpuSlowdownFor(index)).toBeCloseTo(TARGET_BENCHMARK_INDEX, -1)
    }
  })

  it('never speeds a machine up: one slower than the phone runs at 1x (its numbers are then pessimistic)', () => {
    expect(cpuSlowdownFor(900)).toBe(1)
    expect(cpuSlowdownFor(1100)).toBe(1)
  })

  it('caps the slowdown at 20x, the top of the range Lighthouse documents', () => {
    expect(MAX_CPU_SLOWDOWN).toBe(20)
    expect(cpuSlowdownFor(50_000)).toBe(20)
  })

  it('refuses a benchmark that is not a positive number, rather than guessing', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => cpuSlowdownFor(bad)).toThrow(/benchmark index/)
    }
  })

  it('takes the median of several benchmarks (one noisy reading does not decide it)', () => {
    expect(median([2300, 1700, 2350])).toBe(2300)
    expect(median([2000, 2400, 1000, 2200])).toBe(2100)
    expect(() => median([])).toThrow()
  })

  it("says how far each Lighthouse run's own simulated phone drifted from the target", () => {
    // The run measures the machine again; the slowdown was fixed before it. 2.13x on a run that measured 1704 is a phone of 800.
    const drift = driftFromTarget([2345, 1704, 2600], 2.13)

    expect(drift.simulated).toEqual([1101, 800, 1221])
    expect(drift.worst).toBeCloseTo(-0.273, 3)
  })
})
