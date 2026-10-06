import { useEffect, useState } from 'react'

/** "28 s", "1 min 30 s", "2 min": a wait in words a person reads at a glance. */
export function formatWait(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds))
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

type Clock = { endsAt: number; now: number; done: boolean }

/**
 * A wait the page imposes, counted down once a second. `start(seconds)` begins it; `secondsLeft` is the whole
 * seconds remaining (0 when idle or over); `over` is true once a started wait has run out. It only counts: what
 * to do at zero is the caller's.
 */
export function useCountdown() {
  const [clock, setClock] = useState<Clock | null>(null)
  const endsAt = clock?.endsAt ?? null
  const running = clock !== null && !clock.done

  useEffect(() => {
    if (endsAt === null || !running) return undefined
    const timer = setInterval(() => {
      const now = Date.now()
      setClock({ endsAt, now, done: now >= endsAt })
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [endsAt, running])

  return {
    secondsLeft: clock === null || clock.done ? 0 : Math.max(0, Math.ceil((clock.endsAt - clock.now) / 1000)),
    over: clock?.done ?? false,
    start: (seconds: number) => {
      const now = Date.now()
      setClock({ endsAt: now + seconds * 1000, now, done: seconds <= 0 })
    },
    reset: () => {
      setClock(null)
    },
  }
}
