import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with the value it is given', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('passes a change on only after the delay with no further change', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'k' },
    })

    rerender({ value: 'ke' })
    act(() => void vi.advanceTimersByTime(299))
    expect(result.current).toBe('k')

    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe('ke')
  })

  it('restarts the wait on every change, so fast typing yields one value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'k' },
    })

    for (const value of ['ke', 'key', 'keyb', 'keyboard']) {
      rerender({ value })
      act(() => void vi.advanceTimersByTime(200))
      expect(result.current).toBe('k')
    }

    act(() => void vi.advanceTimersByTime(300))
    expect(result.current).toBe('keyboard')
  })
})
