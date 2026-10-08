import { test } from './fixtures'
import { expectNoOverflow } from './layout'
import { colorSchemes, openScreen, screens, widths } from './screens'

// Runs for every screen in e2e/screens.ts: a screen added there is checked here automatically.
for (const screen of screens) {
  for (const colorScheme of colorSchemes) {
    for (const width of widths) {
      test.describe(`${screen.name} at ${width} px, ${colorScheme}`, () => {
        test.use({
          viewport: { width, height: 800 },
          colorScheme,
          allowedConsoleErrors: screen.allowedConsoleErrors ?? [],
        })

        test('has no sideways scroll and no clipped text', async ({ page }) => {
          await openScreen(page, screen)

          await expectNoOverflow(page)
        })
      })
    }
  }
}
