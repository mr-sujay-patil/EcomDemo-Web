import type { Page } from '@playwright/test'

// web KI-028. A native <select> does not draw its option's text node: Chromium copies the chosen label into a text node of
// its own, inside the select's user-agent shadow root, with a style of its own. The CI failures fit that copy, and only it,
// missing the `font-display: swap` of the body face: only the sort select's text differed, by the same 202 pixels at 360 and
// 1280 px (the string, not its place), after Playwright had seen every font loaded and two captures 100 ms apart agreed (a
// final state, not one caught mid-load). Not reproduced on this repo's local Chromium; see KNOWN_ISSUES.md, KI-028.

/** Faces that drew the text of each native select on the page, as Chromium reports them (CSS.getPlatformFontsForNode). */
export async function selectFaces(
  page: Page,
): Promise<{ text: string; faces: { family: string; webFont: boolean }[] }[]> {
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    // `pierce` reaches into shadow roots: the select's own text lives in one.
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true })
    type Node = typeof root
    const selects: Node[] = []
    const walk = (node: Node) => {
      if (node.nodeName === 'SELECT') selects.push(node)
      for (const child of [
        ...(node.shadowRoots ?? []),
        ...(node.children ?? []),
        ...(node.contentDocument ? [node.contentDocument] : []),
      ]) {
        walk(child)
      }
    }
    walk(root)

    const result = []
    for (const select of selects) {
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: select.nodeId })
      const { object } = await cdp.send('DOM.resolveNode', { nodeId: select.nodeId })
      const text = await cdp.send('Runtime.callFunctionOn', {
        objectId: object.objectId,
        functionDeclaration: 'function () { return this.selectedOptions[0]?.label ?? "" }',
        returnByValue: true,
      })
      result.push({
        text: String(text.result.value),
        faces: fonts.map((font) => ({ family: font.familyName, webFont: font.isCustomFont })),
      })
    }
    return result
  } finally {
    await cdp.detach()
  }
}

/**
 * Waits until the page's fonts are in and every native select draws its text with them. Call it right before a picture.
 *
 * 1. `document.fonts.ready`: no face is still loading.
 * 2. Each select is laid out again from scratch (out of the layout and back), so its copied label takes the faces as they
 *    are now, whatever order the page and the font files arrived in. Nothing else on the page is touched, and a select
 *    that had focus gets it back.
 * 3. The check: Chromium is asked which face drew each select's text. A face that is not one of the app's own
 *    (@font-face) means the select fell back, and the picture would not be the code's: this fails, naming the face.
 */
export async function settleFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => {
    for (const select of document.querySelectorAll('select')) {
      const focused = document.activeElement === select
      const display = select.style.display
      select.style.display = 'none'
      // Reading a layout value makes the browser drop the select's box now, not at the next frame.
      void select.offsetWidth
      select.style.display = display
      void select.offsetWidth
      if (focused) select.focus({ preventScroll: true })
    }
    await document.fonts.ready
  })

  // A select with an empty label draws no glyph, so it has no face to check.
  const fellBack = (await selectFaces(page)).filter(
    ({ text, faces }) => text !== '' && (faces.length === 0 || faces.some((face) => !face.webFont)),
  )
  if (fellBack.length > 0) {
    const named = fellBack.map(
      ({ text, faces }) => `"${text}" drawn in ${faces.map((face) => face.family).join(', ') || 'no face'}`,
    )
    throw new Error(
      `A native select draws its text in a fallback face, not the app's own (web KI-028): ${named.join('; ')}`,
    )
  }
}
