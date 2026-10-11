export const REFERENCE: { benchmarkIndex: number; cpuSlowdownMultiplier: number }
export const TARGET_BENCHMARK_INDEX: number
export const MAX_CPU_SLOWDOWN: number
export function median(values: number[]): number
export function cpuSlowdownFor(benchmarkIndex: number, target?: number): number
export function driftFromTarget(
  benchmarkIndexes: number[],
  multiplier: number,
  target?: number,
): { simulated: number[]; worst: number }
