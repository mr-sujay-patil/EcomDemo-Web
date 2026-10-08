import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// The real console against the real backend, as the seeded ADMIN account. The credentials come from the environment and are
// never written down. Without them these specs are not registered at all, so a run without them says nothing about the console
// (the Phase Review Report says so): they need the two variables here, and as secrets in the CI workflow.
const username = process.env.E2E_ADMIN_USERNAME
const password = process.env.E2E_ADMIN_PASSWORD

if (username && password) {
  test.describe('the admin console', () => {
    async function signInAsAdmin(page: Page, next: string) {
      await page.goto(`/sign-in?next=${encodeURIComponent(next)}`)
      await page.getByLabel('Username').fill(username!)
      await page.getByLabel('Password', { exact: true }).fill(password!)
      await page.getByRole('button', { name: 'Sign in' }).click()
    }

    async function deleteByName(page: Page, name: string) {
      await page.getByRole('button', { name: `Delete ${name}` }).click()
      await page.getByLabel('Product name').fill(name)
      await page.getByRole('button', { name: 'Delete product' }).click()
      await expect(page.getByText(`Deleted “${name}”.`)).toBeVisible()
    }

    test('create, edit and delete a product', async ({ page }) => {
      const name = `E2E product ${Date.now().toString(36)}`
      await signInAsAdmin(page, '/admin/products/new')

      await page.getByLabel('Name').fill(name)
      await page.getByLabel('Description').fill('Made by the admin spec')
      await page.getByLabel('Price').fill('123.45')
      await page.getByLabel('Stock').fill('3')
      await page.getByRole('button', { name: 'Create product' }).click()
      const row = page.getByRole('row', { name: new RegExp(name) })
      await expect(row).toBeVisible()
      await expect(row).toContainText('₹123.45')

      await page.getByRole('link', { name: `Edit ${name}` }).click()
      await page.getByLabel('Price').fill('200')
      await page.getByRole('button', { name: 'Save changes' }).click()
      await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('₹200.00')

      await deleteByName(page, name)
      await expect(page.getByRole('row', { name: new RegExp(name) })).toHaveCount(0)
    })

    test('sets a stock level (to the level it already has, so the shop is left as it was)', async ({ page }) => {
      await signInAsAdmin(page, '/admin/stock')

      const row = page.getByRole('row', { name: /Mechanical Keyboard/ })
      const level = (await row.locator('td').first().innerText()).trim()
      expect(level).toMatch(/^\d+$/)
      await row.getByLabel('New level for Mechanical Keyboard').fill(level)
      await row.getByRole('button', { name: 'Set stock' }).click()
      await expect(row.getByText(`Stock is now ${level}.`)).toBeVisible()
    })

    test('imports a CSV with one bad row: it is previewed, and skipCount is 1', async ({ page }) => {
      const name = `E2E import ${Date.now().toString(36)}`
      await signInAsAdmin(page, '/admin/import')

      await page.getByLabel('CSV file').setInputFiles({
        name: 'products.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          `name,description,price,stock_quantity,category\n${name},From the admin spec,99.00,1,E2E\nBad row,Not a price,abc,1,E2E\n`,
        ),
      })
      await expect(page.getByRole('cell', { name })).toBeVisible()
      await page.getByRole('button', { name: 'Import 2 rows' }).click()

      await expect(page.getByText('The import finished.')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Skipped').locator('..')).toContainText('1')

      await page.getByRole('link', { name: 'Products' }).click()
      await deleteByName(page, name)
    })

    test('refuses a CSV with the wrong header before sending it', async ({ page }) => {
      await signInAsAdmin(page, '/admin/import')

      await page
        .getByLabel('CSV file')
        .setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('name,price\nA,1\n') })

      await expect(page.getByText('This file cannot be imported')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Import/ })).toHaveCount(0)
    })
  })
}
