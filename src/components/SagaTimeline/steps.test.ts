import { describe, expect, it } from 'vitest'
import { reachedIndex, STEPS, stepIcon, stepNote, stepState } from './steps'

// Pure helpers taken out of SagaTimeline for web KI-038 (Sonar S3776); the timeline's own tests cover the rendering.
describe('reachedIndex', () => {
  it('is past every step once CONFIRMED', () => {
    expect(reachedIndex('CONFIRMED', 'stock', undefined)).toBe(STEPS.length)
  })
  it('stops at the failed step when CANCELLED, stock when the step is unknown', () => {
    expect(reachedIndex('CANCELLED', 'stock', 'payment')).toBe(2)
    expect(reachedIndex('CANCELLED', 'payment', undefined)).toBe(1)
  })
  it('stops at the current step while PENDING', () => {
    expect(reachedIndex('PENDING', 'payment', 'stock')).toBe(2)
  })
})

describe('stepState', () => {
  it('marks steps before, at and after the reached one', () => {
    expect(stepState(0, 1, 'PENDING')).toBe('done')
    expect(stepState(1, 1, 'PENDING')).toBe('current')
    expect(stepState(2, 1, 'PENDING')).toBe('todo')
    expect(stepState(1, 1, 'CANCELLED')).toBe('failed')
    expect(stepState(2, 1, 'CANCELLED')).toBe('skipped')
  })
})

describe('stepNote and stepIcon', () => {
  it('say what each state means', () => {
    expect(stepNote('failed', 'Card declined', '10:00')).toBe('Card declined')
    expect(stepNote('current', 'x', '10:00')).toBe('In progress…')
    expect(stepNote('skipped', 'x', '10:00')).toBe('Not reached')
    expect(stepNote('done', 'x', '10:00')).toBe('10:00')
    expect(stepIcon('done', 'truck')).toBe('check')
    expect(stepIcon('failed', 'truck')).toBe('x')
    expect(stepIcon('current', 'truck')).toBe('clock')
    expect(stepIcon('todo', 'truck')).toBe('truck')
  })
})
