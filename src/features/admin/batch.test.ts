import { describe, expect, it } from 'vitest'
import { backfillSummary, type BackfillStatus } from './batch'

const run = (over: Partial<BackfillStatus>): BackfillStatus => ({
  executionId: 7,
  status: 'STARTED',
  read: 4,
  written: 3,
  indexedProducts: 0,
  totalProducts: 10,
  failure: '',
  startedAt: '2026-10-11T10:00:00Z',
  endedAt: '',
  ...over,
})

// Taken out of SearchIndexPage for web KI-038 (Sonar S3776); the page's own tests cover the rendering.
describe('backfillSummary', () => {
  it('counts the indexed products when the run completed', () => {
    expect(backfillSummary(run({ status: 'COMPLETED', indexedProducts: 10 }))).toBe(
      'Done: 10 of 10 products are indexed.',
    )
  })
  it('gives the reason when it failed', () => {
    expect(backfillSummary(run({ status: 'FAILED', failure: 'No model.' }))).toBe('The run failed. No model.')
  })
  it('says how far a running run got', () => {
    expect(backfillSummary(run({}))).toBe('STARTED: 3 of 10 written…')
  })
})
