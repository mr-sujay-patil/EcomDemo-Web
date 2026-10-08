import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { colorSchemes, openScreen, screens } from './screens'

// WCAG 2.3.3 and the design rules: the only motion in the shop is the spinner on a button that is working. It turns
// at 0.8 s a lap, and under `prefers-reduced-motion: reduce` at 2.4 s. Nothing else animates or transitions, and
// nothing scrolls smoothly.

type Motion = { animated: string[]; transitioned: string[]; smooth: string[] }

/** Every element on the page that animates, transitions or scrolls smoothly, as "tag.class name duration". */
async function motionOn(page: Page): Promise<Motion> {
  return page.evaluate(() => {
    const motion: Motion = { animated: [], transitioned: [], smooth: [] }
    const seconds = (value: string) => value.split(',').map((part) => Number.parseFloat(part))
    for (const element of document.querySelectorAll<HTMLElement>('html, body, body *')) {
      const style = getComputedStyle(element)
      const label = `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 30)}`
      if (style.animationName !== 'none')
        motion.animated.push(`${label} ${style.animationName} ${style.animationDuration}`)
      if (seconds(style.transitionDuration).some((duration) => duration > 0) && style.transitionProperty !== 'none') {
        motion.transitioned.push(`${label} ${style.transitionProperty} ${style.transitionDuration}`)
      }
      if (style.scrollBehavior !== 'auto') motion.smooth.push(label)
    }
    return motion
  })
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test.describe(`motion on every screen, with ${reducedMotion}`, () => {
    test.use({ reducedMotion })

    for (const screen of screens) {
      test.describe(screen.name, () => {
        test.use({ allowedConsoleErrors: screen.allowedConsoleErrors ?? [] })

        test('nothing but the spinner moves', async ({ page }) => {
          await openScreen(page, screen)

          const motion = await motionOn(page)

          expect(motion.transitioned, 'no transitions').toEqual([])
          expect(motion.smooth, 'no smooth scrolling').toEqual([])
          expect(
            motion.animated.filter((entry) => !entry.includes(' ed-spin ')),
            'no animation but the spinner',
          ).toEqual([])
        })
      })
    }
  })
}

for (const colorScheme of colorSchemes) {
  test.describe(`the spinner, ${colorScheme}`, () => {
    test.use({ colorScheme })

    async function spinnerLap(page: Page) {
      // A sign-in that never answers keeps its button working, so the spinner stays on the page.
      await page.route('**/api/auth/login', () => new Promise(() => undefined))
      await page.goto('/sign-in')
      await page.getByLabel('Username').fill('e2e.person')
      await page.getByLabel('Password', { exact: true }).fill('a long enough password')
      await page.getByRole('button', { name: 'Sign in' }).click()
      const spinner = page.locator('.ed-spinner')
      await expect(spinner).toBeVisible()
      return spinner.evaluate((element) => ({
        name: getComputedStyle(element).animationName,
        duration: getComputedStyle(element).animationDuration,
        hiddenFromReaders: element.getAttribute('aria-hidden'),
      }))
    }

    test('turns once every 0.8 s', async ({ page }) => {
      expect(await spinnerLap(page)).toEqual({ name: 'ed-spin', duration: '0.8s', hiddenFromReaders: 'true' })
    })

    test.describe('when the person asks for less motion', () => {
      test.use({ reducedMotion: 'reduce' })

      test('turns once every 2.4 s', async ({ page }) => {
        expect(await spinnerLap(page)).toEqual({ name: 'ed-spin', duration: '2.4s', hiddenFromReaders: 'true' })
      })
    })
  })
}
