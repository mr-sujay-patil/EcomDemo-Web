import { test } from './fixtures'
import { expectNoOverflow } from './layout'
import { colorSchemes, openScreen, screens } from './screens'

// WCAG 1.4.4 (resize text) and 1.4.10 (reflow): the layout checks of layout.spec.ts, again under the ways a person
// enlarges the page.
const conditions = [
  // 200% browser zoom on a 1280 px window is a 640 px wide viewport in CSS pixels.
  { name: '200% zoom on a desktop window', viewport: { width: 640, height: 400 }, rootFontSize: null },
  // 400% zoom on a 1280 px window is a 320 px wide viewport: the smallest width WCAG asks content to reflow to.
  { name: '400% zoom on a desktop window', viewport: { width: 320, height: 256 }, rootFontSize: null },
  // A person who sets a larger default font size: the root size is 20 px instead of 16 (125%).
  { name: 'a 20 px root font size on a phone', viewport: { width: 360, height: 800 }, rootFontSize: 20 },
  { name: 'a 20 px root font size on a desktop', viewport: { width: 1280, height: 800 }, rootFontSize: 20 },
] as const

for (const screen of screens) {
  for (const colorScheme of colorSchemes) {
    for (const condition of conditions) {
      test.describe(`${screen.name}, ${condition.name}, ${colorScheme}`, () => {
        test.use({ viewport: condition.viewport, colorScheme, allowedConsoleErrors: screen.allowedConsoleErrors ?? [] })

        test('has no sideways scroll and no clipped text', async ({ page }) => {
          await openScreen(page, screen)
          if (condition.rootFontSize) {
            await page.addStyleTag({ content: `html { font-size: ${condition.rootFontSize}px !important; }` })
          }

          await expectNoOverflow(page)
        })
      })
    }
  }
}
