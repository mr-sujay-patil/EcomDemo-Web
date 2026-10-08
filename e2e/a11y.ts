import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

/** WCAG 2.0, 2.1 and 2.2 at levels A and AA: the standard this phase answers to. */
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Rules switched off, each with the reason. Empty on purpose: a false positive is added here with a comment and a
 * line in docs/decisions.md, never silenced in passing.
 */
const suppressedRules: string[] = []

/** Serious and critical violations on the page as it is now, one readable line each. */
export async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).disableRules(suppressedRules).analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => {
      const where = violation.nodes
        .map((node) => node.target.join(' '))
        .slice(0, 3)
        .join(' | ')
      return `${violation.impact}: ${violation.id} (${violation.help}) at ${where}`
    })
}
