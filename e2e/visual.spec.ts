import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { settleFonts } from './fonts'
import { colorSchemes, openScreen, screens, stubConsole, type Screen } from './screens'

// Visual regression: the key screens, at a phone and a desktop width, in both themes, compared with the pictures in
// e2e/visual.spec.ts-snapshots/. Every answer is stubbed (the shelf, the product, the orders), so the pictures depend
// on the code and nothing else. Fonts are the app's own (@font-face), the clock is not shown, animations are off, and
// settleFonts (e2e/fonts.ts) makes sure a native select draws its text in them too (web KI-028).
//
// When a picture changes on purpose, update the baselines with `npm run e2e:baselines` and say why in the PR: a changed
// baseline is a reviewed change. A change nobody meant fails this spec.

const widths = [360, 1280] as const

const confirmedOrder = {
  id: 43,
  placedAt: '2026-10-06T10:00:00Z',
  username: 'e2e.person',
  status: 'CONFIRMED',
  statusReason: '',
  statusChangedAt: '2026-10-06T10:00:04Z',
  totalAmount: 8999,
  items: [{ productId: 1, productName: 'Mechanical Keyboard', unitPrice: 8999, quantity: 1, lineTotal: 8999 }],
}

async function stubConfirmedOrder(page: Page) {
  await page.route('**/api/orders/43', (route) => route.fulfill({ json: confirmedOrder }))
  await page.route('**/api/orders/43/status', (route) =>
    route.fulfill({
      json: { orderId: 43, status: 'CONFIRMED', reason: '', changedAt: confirmedOrder.statusChangedAt },
    }),
  )
}

const named = (name: string): Screen => {
  const found = screens.find((screen) => screen.name === name)
  if (!found) throw new Error(`No screen named ${name} in e2e/screens.ts`)
  return found
}

/** A screen from the shared list, with its answers replaced by the stubbed shop where it would use the real one. */
const shots: Screen[] = [
  {
    name: 'shelf',
    path: '/',
    prepare: stubConsole,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 2, name: 'Mechanical Keyboard' })).toBeVisible()
    },
  },
  {
    name: 'product',
    path: '/products/1',
    prepare: stubConsole,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'Mechanical Keyboard' })).toBeVisible()
    },
  },
  named('cart'),
  {
    name: 'order-confirmed',
    path: '/orders/43',
    signedInAs: 'CUSTOMER',
    prepare: stubConfirmedOrder,
    ready: async (page) => {
      await expect(page.getByText('Your order is confirmed.')).toBeVisible()
    },
  },
  { ...named('order-detail'), name: 'order-cancelled' },
  named('sign-in'),
  named('assistant-sheet'),
  named('admin-products'),
]

for (const shot of shots) {
  for (const colorScheme of colorSchemes) {
    for (const width of widths) {
      test.describe(`${shot.name} at ${width} px, ${colorScheme}`, () => {
        test.use({
          viewport: { width, height: 800 },
          colorScheme,
          reducedMotion: 'reduce',
          locale: 'en-IN',
          timezoneId: 'Asia/Kolkata',
          allowedConsoleErrors: shot.allowedConsoleErrors ?? [],
        })

        test('looks the way it did', async ({ page }) => {
          await openScreen(page, shot)
          await settleFonts(page)

          await expect(page).toHaveScreenshot(`${shot.name}-${width}-${colorScheme}.png`, { fullPage: true })
        })
      })
    }
  }
}
