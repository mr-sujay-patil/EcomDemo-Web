import type { Page } from '@playwright/test'
import { expect } from './fixtures'

/** Elements that cut off their own text: `overflow: hidden` (or `clip`) with content larger than the box. */
async function clippedTextElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // Rounding can make scrollWidth exceed clientWidth by 1 px with nothing visibly cut off.
    const tolerance = 1
    const clips = (value: string) => value === 'hidden' || value === 'clip'
    const offenders: string[] = []
    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const text = element.textContent?.trim()
      if (!text) continue
      const style = getComputedStyle(element)
      const cutX = clips(style.overflowX) && element.scrollWidth - element.clientWidth > tolerance
      const cutY = clips(style.overflowY) && element.scrollHeight - element.clientHeight > tolerance
      if (cutX || cutY) {
        offenders.push(
          `<${element.tagName.toLowerCase()}> "${text.slice(0, 40)}" (${element.scrollWidth}×${element.scrollHeight} in ${element.clientWidth}×${element.clientHeight})`,
        )
      }
    }
    return offenders
  })
}

/** The page must not scroll sideways and no element may cut off its own text: the two layout rules of CLAUDE.md. */
export async function expectNoOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, 'the page must not scroll sideways').toBeLessThanOrEqual(clientWidth)
  expect(await clippedTextElements(page), 'no element may cut off its text').toEqual([])
}
