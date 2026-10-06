import { execFileSync } from 'node:child_process'
import { test } from './fixtures'
import { colorSchemes, screens } from './screens'

/** docs/test-reports/phase-XX/, from REPORT_PHASE (e.g. `phase-03`) or the current `feature/phase-XX-*` branch. */
function reportDirectory(): string {
  let phase = process.env.REPORT_PHASE
  if (!phase) {
    const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
    phase = /^feature\/(phase-\d{2})-/.exec(branch)?.[1]
  }
  if (!phase)
    throw new Error('Not on a feature/phase-XX-* branch: set REPORT_PHASE=phase-XX to say where the screenshots go.')
  return `docs/test-reports/${phase}`
}

// Run with `npm run e2e:report`. Regenerates the screenshots every test report links to, the same way each phase.
test.describe('@report screenshots', () => {
  for (const screen of screens.filter((candidate) => candidate.report !== false)) {
    for (const colorScheme of colorSchemes) {
      for (const width of [360, 1280]) {
        test.describe(`${screen.name} at ${width} px, ${colorScheme}`, () => {
          test.use({
            viewport: { width, height: 800 },
            colorScheme,
            allowedConsoleErrors: screen.allowedConsoleErrors ?? [],
            // The report shows the shop as a customer sees it: the real photos from the backend.
            realImages: true,
          })

          test('screenshot', async ({ page }) => {
            await screen.prepare?.(page)
            await page.goto(screen.path)
            await screen.ready(page)
            // Resolved here, not at load time: every project loads this file, even on branches with no report.
            await page.screenshot({
              path: `${reportDirectory()}/${screen.name}-${width}-${colorScheme}.png`,
              fullPage: true,
            })
          })
        })
      }
    }
  }
})
