import { describe, expect, it } from 'vitest'
import { GIVE_UP_AFTER_MS, isPolling, nextPhase, POLL_MS, SLOW_AFTER_MS, type OrderPhase } from './orderStatus'

const run = (from: OrderPhase, ...events: Parameters<typeof nextPhase>[1][]) =>
  events.reduce<OrderPhase>(nextPhase, from)

describe('the order status machine', () => {
  it('walks placing, pending, slow, gaveUp', () => {
    expect(run('placing', { type: 'accepted' })).toBe('pending')
    expect(run('pending', { type: 'slow' })).toBe('slow')
    expect(run('slow', { type: 'giveUp' })).toBe('gaveUp')
    expect(run('pending', { type: 'giveUp' })).toBe('gaveUp')
  })

  it('stays pending while the server says PENDING', () => {
    expect(run('pending', { type: 'status', status: 'PENDING' })).toBe('pending')
    expect(run('slow', { type: 'status', status: 'PENDING' })).toBe('slow')
  })

  it.each(['pending', 'slow', 'gaveUp'] as const)('ends at confirmed or cancelled from %s', (from) => {
    expect(run(from, { type: 'status', status: 'CONFIRMED' })).toBe('confirmed')
    expect(run(from, { type: 'status', status: 'CANCELLED' })).toBe('cancelled')
  })

  it.each(['confirmed', 'cancelled'] as const)('never leaves %s', (from) => {
    for (const event of [
      { type: 'accepted' },
      { type: 'slow' },
      { type: 'giveUp' },
      { type: 'status', status: 'PENDING' },
      { type: 'status', status: 'CONFIRMED' },
      { type: 'status', status: 'CANCELLED' },
    ] as const) {
      expect(nextPhase(from, event)).toBe(from)
    }
  })

  it('ignores a timer that fires in the wrong phase', () => {
    expect(run('placing', { type: 'slow' })).toBe('placing')
    expect(run('placing', { type: 'giveUp' })).toBe('placing')
    expect(run('gaveUp', { type: 'slow' })).toBe('gaveUp')
    expect(run('pending', { type: 'accepted' })).toBe('pending')
    expect(run('placing', { type: 'status', status: 'PENDING' })).toBe('placing')
  })

  it('polls only while pending or slow', () => {
    expect((['placing', 'pending', 'slow', 'confirmed', 'cancelled', 'gaveUp'] as const).filter(isPolling)).toEqual([
      'pending',
      'slow',
    ])
  })

  it('keeps its numbers inside what the guide and the phase say', () => {
    expect(POLL_MS).toBeGreaterThanOrEqual(1000)
    expect(POLL_MS).toBeLessThanOrEqual(2000)
    expect(SLOW_AFTER_MS).toBe(15_000)
    expect(GIVE_UP_AFTER_MS).toBe(90_000)
  })
})
