import { afterFirstPaint, type Schedule } from './afterFirstPaint'

/**
 * Loads the font faces the first view does not need (src/styles/fonts-deferred.css) after the page's first paint.
 *
 * Lighthouse's simulated LCP replays every request that ended before the observed LCP on its slow link. With all seven faces in
 * the first stylesheet, the shelf asked for six of them as soon as React drew text, and on a fast load (CI) all six ended before
 * the products' paint: 120 KB counted against LCP, about 0.6 s at the simulated phone (web KI-042, KI-043). Only the two preloaded
 * faces (headings, body text) stay in tokens.css. **The price:** until this stylesheet and its files arrive, medium and italic
 * headings, semibold text and the mono figures show in their fallback font, then swap (font-display: swap).
 *
 * `<html data-fonts="all">` says the stylesheet is in (`failed` if it could not load); tests read it. A failure never breaks the
 * page: the text stays in the fallback fonts.
 */
type Load = () => Promise<unknown>

export function loadDeferredFontsAfterFirstPaint(
  load: Load = () => import('@/styles/fonts-deferred.css'),
  schedule: Schedule = afterFirstPaint,
) {
  schedule(() => {
    load().then(
      () => {
        document.documentElement.dataset.fonts = 'all'
      },
      () => {
        document.documentElement.dataset.fonts = 'failed'
      },
    )
  })
}
