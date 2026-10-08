import { useEffect, useState } from 'react'

/**
 * The value, but only after it has stopped changing for `delay` ms. Every change restarts the wait, so typing "keyboard"
 * quickly yields one new value, not eight. (Throttling is the other tool: it lets a value through at most once per interval
 * while it keeps changing; for as-you-type search the pause is what we want.)
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
