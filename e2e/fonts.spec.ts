import { expect, test } from './fixtures'
import { selectFaces, settleFonts } from './fonts'
import { stubConsole } from './screens'

// web KI-028: the visual baselines must not depend on when the body face arrived. These tests keep the guard honest: it
// catches a select drawn in a fallback face, it passes the real shelf, and laying the select out again changes nothing a
// person could see or use.

const shelfHeading = 'Mechanical Keyboard'

test.describe('the select font guard (web KI-028)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light', reducedMotion: 'reduce' })

  test.describe('when the body face never arrives', () => {
    // The aborted font file is the browser's own console error, on purpose.
    test.use({ allowedConsoleErrors: [/Failed to load resource/] })

    test('it fails and names the face the select fell back to', async ({ page }) => {
      await stubConsole(page)
      await page.route(/IBMPlexSans-Regular[^/]*\.woff2$/, (route) => route.abort())
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 2, name: shelfHeading })).toBeVisible()

      await expect(settleFonts(page)).rejects.toThrow(/"Name \(A to Z\)" drawn in (?!IBM Plex Sans)/)
    })
  })

  test("it passes the shelf, whose sort select draws its text in the app's body face", async ({ page }) => {
    await stubConsole(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 2, name: shelfHeading })).toBeVisible()

    await settleFonts(page)

    expect(await selectFaces(page)).toEqual([
      { text: 'Name (A to Z)', faces: [{ family: 'IBM Plex Sans', webFont: true }] },
    ])
  })

  test('laying the select out again keeps its focus, its choice and its place', async ({ page }) => {
    await stubConsole(page)
    await page.goto('/?sort=price-desc')
    const sort = page.getByLabel('Sort by')
    await expect(page.getByRole('heading', { level: 2, name: shelfHeading })).toBeVisible()
    await sort.focus()
    const before = await sort.boundingBox()

    await settleFonts(page)

    await expect(sort).toBeFocused()
    await expect(sort).toHaveValue('price-desc')
    expect(await sort.boundingBox()).toEqual(before)
  })
})
