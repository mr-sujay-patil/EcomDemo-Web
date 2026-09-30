import { describe, expect, it } from 'vitest'

// Throwaway (Phase 5, Done when): proves a failing unit test turns the PR red. Reverted next commit.
describe('CI probe', () => {
  it('fails on purpose', () => {
    expect(1 + 1).toBe(3)
  })
})
