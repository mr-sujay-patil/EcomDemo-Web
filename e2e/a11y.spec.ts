import { seriousViolations } from './a11y'
import { expect, test } from './fixtures'
import { colorSchemes, openScreen, screens } from './screens'

/**
 * Narrow screen and wide screen: target size, reflow and contrast all depend on the layout.
 * (Every width is already covered for overflow by layout.spec.ts; axe is slow, so two are enough.)
 */
const scanWidths = [360, 1280] as const

// Every screen in e2e/screens.ts (signed out, customer and admin) in both themes: a screen added there is scanned here.
for (const screen of screens) {
  for (const colorScheme of colorSchemes) {
    for (const width of scanWidths) {
      test.describe(`axe: ${screen.name} at ${width} px, ${colorScheme}`, () => {
        test.use({
          viewport: { width, height: 800 },
          colorScheme,
          allowedConsoleErrors: screen.allowedConsoleErrors ?? [],
        })

        test('has no serious or critical violation', async ({ page }) => {
          await openScreen(page, screen)

          expect(await seriousViolations(page)).toEqual([])
        })
      })
    }
  }
}
