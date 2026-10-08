import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

/**
 * Writes the page's Core Web Vitals to the console while developing, so a regression is seen while it is made.
 * No analytics service: in a production build this does nothing (and the import is dropped from the bundle).
 */
export function logWebVitals() {
  if (!import.meta.env.DEV) return
  // Development only, and the console is the output.
  /* eslint-disable no-console */
  const log = ({ name, value, rating }: Metric) =>
    console.debug(`[web-vitals] ${name} ${Math.round(value * 1000) / 1000} (${rating})`)
  onLCP(log)
  onCLS(log)
  onINP(log)
  onFCP(log)
  onTTFB(log)
}
