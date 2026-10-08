import { expect, test } from './fixtures'
import { tabThroughPage } from './keyboard'
import { colorSchemes, openScreen, screens } from './screens'

// WCAG 2.4.7 (focus visible), 2.4.11 (focus not obscured), 2.1.1 (keyboard) and 2.1.2 (no keyboard trap), checked on every screen of
// e2e/screens.ts: one lap of Tab must reach every control, show where it is, and come out the other side.
for (const screen of screens) {
  for (const colorScheme of colorSchemes) {
    test.describe(`keyboard sweep: ${screen.name}, ${colorScheme}`, () => {
      test.use({
        // Narrow in the dark theme and wide in the light one: both layouts and both palettes are covered.
        viewport: colorScheme === 'dark' ? { width: 360, height: 800 } : { width: 1280, height: 800 },
        colorScheme,
        allowedConsoleErrors: screen.allowedConsoleErrors ?? [],
      })

      test('Tab reaches every control, shows focus on each, and is never trapped', async ({ page }) => {
        await openScreen(page, screen)

        const { stops, missed } = await tabThroughPage(page)

        expect(stops.length, 'the page has something to focus').toBeGreaterThan(0)
        expect(
          stops.filter((stop) => !stop.indicated).map((stop) => stop.label),
          'every focused control draws an outline or shadow',
        ).toEqual([])
        expect(
          stops.filter((stop) => !stop.onScreen).map((stop) => stop.label),
          'every focused control is in the window and not covered by anything',
        ).toEqual([])
        expect(missed, 'every control is reachable with Tab').toEqual([])
      })
    })
  }
}
