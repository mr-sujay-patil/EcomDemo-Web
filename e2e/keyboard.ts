import type { Locator, Page } from '@playwright/test'
import { expect } from './fixtures'

/**
 * Watches for the mouse and touch. A keyboard-only test ends with `expectUnused()`: pressing Enter on a button fires a
 * `click` but never a `mousedown` or `pointerdown`, so a stray `locator.click()` in a flow fails the test. The page
 * reports to the test through an exposed function, so a full page load does not lose the record.
 */
export async function watchPointer(page: Page) {
  let used = false
  await page.exposeFunction('reportPointerUse', () => {
    used = true
  })
  await page.addInitScript(() => {
    const report = () => (window as unknown as { reportPointerUse: () => void }).reportPointerUse()
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) window.addEventListener(type, report, true)
  })
  return {
    expectUnused() {
      expect(used, 'the flow must not use the mouse').toBe(false)
    },
  }
}

const hasFocus = (locator: Locator) => locator.evaluate((element) => element.contains(document.activeElement))

/** Presses Tab until `target` (or something inside it) has focus; fails if a whole lap of the page never gets there. */
export async function tabTo(page: Page, target: Locator, maxPresses = 150) {
  await expect(target).toBeVisible()
  for (let presses = 0; presses <= maxPresses; presses += 1) {
    if (await hasFocus(target)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`Tab never reached ${String(target)} in ${maxPresses} presses`)
}

/** Reaches a control with Tab and activates it with Enter (links, buttons) or Space (when `key` says so). */
export async function activate(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') {
  await tabTo(page, target)
  await page.keyboard.press(key)
}

/** Reaches a text field with Tab and types into it, replacing what it holds. */
export async function typeInto(page: Page, field: Locator, text: string) {
  await tabTo(page, field)
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(text)
}

export type FocusStop = {
  /** A readable name for the report: tag, role or label. */
  label: string
  /** The element draws something around itself when focused (an outline or a box shadow). */
  indicated: boolean
  /** The element, once focused, lies at least partly inside the viewport and nothing sits on top of it (WCAG 2.4.11). */
  onScreen: boolean
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Presses Tab through the page, as far as one lap, and describes every stop. `missed` lists the controls on the page
 * (inside the open dialog, when one is open) that no Tab ever reached.
 */
export async function tabThroughPage(page: Page, maxPresses = 250): Promise<{ stops: FocusStop[]; missed: string[] }> {
  // Tab continues from the last focused element or click, even after a blur: put the starting point at the top.
  await page.evaluate(() => {
    // Focusing the body itself (given a tabindex for a moment) moves the starting point there.
    document.body.tabIndex = -1
    document.body.focus()
    document.body.removeAttribute('tabindex')
  })
  const stops: FocusStop[] = []
  for (let presses = 0; presses < maxPresses; presses += 1) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null
      if (!element || element === document.body || element === document.documentElement) return null

      // What focus changes: the element and the three boxes around it (a field draws its ring on its wrapper).
      const looks = () => {
        const parts: string[] = []
        let box: HTMLElement | null = element
        for (let depth = 0; box && depth < 4; depth += 1, box = box.parentElement) {
          // The box itself and its ::before and ::after (a card's link draws the ring on a pseudo-element).
          for (const pseudo of [null, '::before', '::after']) {
            const style = getComputedStyle(box, pseudo)
            parts.push(
              [
                style.outlineStyle,
                style.outlineWidth,
                style.outlineColor,
                style.boxShadow,
                style.borderColor,
                style.backgroundColor,
                style.textDecorationLine,
              ].join('|'),
            )
          }
        }
        return parts.join('\n')
      }
      const focused = looks()
      element.blur()
      const plain = looks()
      element.focus()

      const marks = (window as unknown as { tabSeen?: Set<Element> }).tabSeen ?? new Set<Element>()
      ;(window as unknown as { tabSeen?: Set<Element> }).tabSeen = marks
      const repeated = marks.has(element)
      marks.add(element)
      const rect = element.getBoundingClientRect()
      // The middle of the part of the element that is inside the window, and what is painted there.
      const visible = {
        left: Math.max(rect.left, 0),
        right: Math.min(rect.right, innerWidth),
        top: Math.max(rect.top, 0),
        bottom: Math.min(rect.bottom, innerHeight),
      }
      const inWindow = visible.right > visible.left && visible.bottom > visible.top
      const hit = inWindow
        ? document.elementFromPoint((visible.left + visible.right) / 2, (visible.top + visible.bottom) / 2)
        : null
      const uncovered =
        hit !== null &&
        (element.contains(hit) ||
          hit.contains(element) ||
          (element as HTMLInputElement).labels?.[0]?.contains(hit) === true)
      const label =
        element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 30) ?? element.tagName.toLowerCase()
      return {
        label: `<${element.tagName.toLowerCase()}> ${label || element.getAttribute('name') || element.getAttribute('type') || ''}`,
        indicated: focused !== plain,
        onScreen: uncovered,
        repeated,
      }
    })
    // Focus left the page (to the browser) or came back round: the lap is over.
    if (!stop || stop.repeated) break
    stops.push({ label: stop.label, indicated: stop.indicated, onScreen: stop.onScreen })
  }

  const missed = await page.evaluate(
    ({ selector }) => {
      const visited = (window as unknown as { tabSeen?: Set<Element> }).tabSeen ?? new Set<Element>()
      const scope = document.querySelector('dialog[open]') ?? document.body
      const shown = (element: Element) => {
        const box = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && !element.closest('[inert]')
      }
      const radioGroups = new Set<string>()
      const missedLabels: string[] = []
      for (const element of scope.querySelectorAll(selector)) {
        if (!shown(element) || visited.has(element)) continue
        // Only the checked radio of a group is in the tab order; the arrow keys reach the others.
        if (element instanceof HTMLInputElement && element.type === 'radio') {
          if (radioGroups.has(element.name)) continue
          radioGroups.add(element.name)
        }
        missedLabels.push(
          `<${element.tagName.toLowerCase()}> ${element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 30)}`,
        )
      }
      return missedLabels
    },
    { selector: focusableSelector },
  )
  return { stops, missed }
}
