import { expect, test } from './fixtures'

// Throwaway (Phase 5, Done when): proves a failing E2E test turns the PR red. Reverted next commit.
test('CI probe: fails on purpose', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'This heading does not exist' })).toBeVisible({ timeout: 2_000 })
})
