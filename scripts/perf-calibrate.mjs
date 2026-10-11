// Stub: today's behaviour, a constant 4x whatever the machine (fix KI-027 replaces it).
export const REFERENCE = { benchmarkIndex: 4400, cpuSlowdownMultiplier: 4 }
export const TARGET_BENCHMARK_INDEX = 1100
export const MAX_CPU_SLOWDOWN = 20
export const median = (values) => values[0]
export const cpuSlowdownFor = () => 4
export const driftFromTarget = (indexes) => ({ simulated: indexes, worst: 0 })
