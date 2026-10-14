# Performance

How fast the shop is on a simulated phone (Lighthouse benchmark index about 1100, the same on every machine since web KI-027) on a slow connection, how that is measured, what was changed, and what is left. Decisions: `docs/decisions.md` [Phase 21]. The test report with this phase's run: `docs/test-reports/phase-21.md`.

## The budgets

| Budget | Where it is checked | Fails the build? |
|---|---|---|
| Lighthouse performance score at least 90 | `lighthouserc.cjs`, the shelf and a product page, cold | yes |
| LCP at most 2.5 s | the shelf and a product page, with the CPU slowdown calibrated to the machine (web KI-027) | **warning only, for now**: both pages are still over it on CI with the calibrated slowdown (web KI-042); to be promoted to a failure once both are under it with a margin |
| CLS at most 0.1 | the shelf and a product page | yes |
| CLS at most 0.1, blocking time at most 200 ms, a click answered within 200 ms | the cart and an order, signed in (`scripts/perf-flows.mjs`) | yes |
| JavaScript on the shelf at most 170 KB gzipped | `scripts/check-budgets.mjs` (every `npm run verify`) and Lighthouse (bytes as sent) | yes |
| No JavaScript chunk over 100 KB gzipped | `scripts/check-budgets.mjs` | yes |
| Fonts at most 120 KB | Lighthouse (bytes as sent, headers included) | yes |

## Method

- **What is measured:** the production image (the container `npm run perf` builds and starts, nginx serving the build), against the backend stack at the pinned tag. Never the dev server.
- **Cold pages (shelf, a product page):** Lighthouse CI (`@lhci/cli` 0.15.1, which bundles Lighthouse 12.6.1), mobile preset (412 px wide screen, slow-4G network, **simulated**), three runs per page, the **median** judged. `npm run perf` prints the median table. The CPU slowdown is **calibrated to the machine** (since web KI-027): `scripts/perf-calibrate.mjs` measures Lighthouse's own benchmark index five times and uses index / 1100, so every machine simulates the same phone (4x on the reference desktop below, about 2.1x on a CI runner). The report prints the slowdown and the phone each run actually simulated.
- **Pages that need a signed-in person (the cart, an order):** a page load ends the session (it lives in memory, by design), so Lighthouse CI cannot load them. `scripts/perf-flows.mjs` signs in with a real account and uses Lighthouse's user-flow **timespan** (Lighthouse 13.5.0 through `puppeteer-core`, with the browser itself throttled: 4x CPU, slow 4G) around two moves: the click on Cart, and Place order through to "Your order is confirmed." A timespan has no LCP (that is for a page load), so it reports what a move does: layout shift (CLS), blocking time (TBT), and the click's own delay (INP). Real clicks are used, so INP is measured. Three runs, median.
- **Machine (the reference: the budgets were set here, at 4x):** Intel Core Ultra 9 285K, 24 threads, 30 GB, WSL2 Ubuntu on Windows 11; Chrome for Testing 153.0.8010.12 (the Chromium Playwright installed). Lighthouse's CPU benchmark index here is about 4400, a fast machine. Simulated throttling scales what the machine measures, so with a constant 4x **a slower machine (CI) measured slower**; the calibrated slowdown removes most of that (each run benchmarks the machine again, so some drift remains, and the report shows it). CI's numbers are still the verdict there.
- **Variation:** the same build measured on this machine gave a shelf LCP of 2.25 s in one full run and 2.40 s in another. Treat differences under about 0.15 s as noise. The three-run median reduces it and does not remove it.
- **Lab, not field.** These are lab numbers for a simulated phone. They find regressions; they do not say what real visitors experience.
- **Data:** the stack at the pin has 14 products. A shop with more products loads and paints a taller shelf; the budgets are for this one.

## What was found, and what was done

The baseline, measured before any change:

| | Performance | FCP | LCP | CLS | JavaScript | Fonts |
|---|---|---|---|---|---|---|
| Shelf | **87** | 2.25 s | **2.55 s** | **0.177** | **192.2 KB** | 120.0 KB |
| Product page | 93 | 2.25 s | **2.87 s** | 0.037 | 192.2 KB | 83.1 KB |

Reading Lighthouse's own diagnosis, not guessing:

- The shelf's **LCP element is the `<h1>`, with 2.1 s of "render delay"**: the heading exists only after all the JavaScript has downloaded, parsed and run. Less JavaScript means an earlier heading.
- **Nearly all of the shelf's CLS (0.176 of 0.177) was the footer** moving down when the products arrived: the loading placeholder was a few hundred pixels tall, the loaded grid is many screens.
- The bundle analysis (`npm run perf:analyze`, a treemap and raw numbers in `bundle-analysis/`) showed **zod (about 35 KB gzipped) and react-hook-form (about 17 KB) in the shelf's entry chunk**, although only the sign-in, register and admin forms use them.
- The **product page's LCP element is the product photo**, marked `loading="lazy"`.

The changes, each measured on its own (median of 3 runs, shelf / product page):

| Step | Shelf perf | Shelf LCP | CLS | JavaScript | Product LCP |
|---|---|---|---|---|---|
| Baseline | 87 | 2.55 s | 0.177 | 192.2 KB | 2.87 s |
| 1. Sign-in and register are lazy routes (zod, react-hook-form out of the shelf); the assistant sheet loads on first use | 88 | 2.40 s | 0.176 | 149.2 KB | 2.72 s |
| 2. The shelf's loading placeholder fills the screen (the footer is out of sight before and after); the product photo is `eager` with `fetchpriority="high"` | **96** | 2.40 s | **0.001** | 149.3 KB | 2.72 s |
| 3. The build is gzip-compressed once at level 9 and nginx serves those files (`gzip_static`), instead of level 1 on the fly | 97 | 2.25 s | 0.001 | **127.3 KB** | 2.57 s |
| 4. Only the heading font is preloaded (it was two) | 97 | 2.25 s | 0.001 | 127.3 KB | **2.42 s** |
| 5. React and the router in one `vendor` chunk (needed for the 100 KB per chunk limit), `ETag` off for hashed files | 96 | 2.40 s | 0.001 | 128.3 KB | 2.57 s |

The headline is the first three: **the shelf went from 87 to 96 and from failing three budgets to passing them, with 33% less JavaScript on the wire and a layout shift of 0.001.** Step 5 gave back about 0.15 s on the product page: the per-chunk limit forces the bundle to be split, and the split costs round trips (see below).

### What the cart and an order do (signed in, final code)

| Move | CLS | TBT | INP | JavaScript fetched |
|---|---|---|---|---|
| Open the cart | 0.024 | 0 ms | 21 ms | 3.6 KB |
| Place the order and watch it confirmed | 0.019 | 0 ms | 19 ms | 3.2 KB |

The flows were written after the fixes, so they have no "before". One earlier reading is worth keeping: opening the cart **straight from the tall shelf** scored a CLS of **0.141**, all of it the footer (the one element that stays when the page is replaced by a shorter one, so it moves a long way). The flow now goes shelf, product page, add, cart, which is the usual route and scores 0.024. The shelf-to-cart number is a real property of single-page navigation that Lighthouse counts; it is not fixed.

## What was tried and was not worth it (or made it worse)

- **No font preloads at all:** the first paint got later (1.95 s to 2.25 s at the time) and the product LCP did not move. One preload (the heading) was the best measured then; since web KI-043 the body face (Plex Sans 400) is preloaded too, and more than those two is still slower (see KI-043 below).
- **Two separate vendor chunks (react, router):** met the 100 KB limit but made the first paint 0.15 s later than one `vendor` chunk (six files to fetch instead of five).
- **Search and content pages as lazy routes:** the shelf's modules to preload went from 5 to 8 files and the first paint got 0.15 s later. Reverted. The shelf and the product page stay in the entry on purpose: they are what a visitor lands on, and a lazy landing page adds a round trip.
- **Subsetting the fonts:** already done (Latin with the rupee sign merged in, per the design system). Nothing left to take out. The shelf loads six faces, 119.9 KB as sent; **that is essentially the floor**, about 0.1 KB under the budget. Adding a font face breaks it, which is what the budget is for. Dropping a weight is a design decision, not a performance one.
- **Keeping the query devtools out of production:** nothing to do, they are not a dependency.

## What is left

- **LCP is still a warning, not a failure**: after KI-027 both pages were still over 2.5 s on CI (shelf 2.87 s, product page 2.63 s at the calibrated slowdown), recorded as web KI-042; the KI-042 fix (below) cut the shelf to 2.64 s and the product page to 2.45 s on CI; the shelf's remaining miss is mostly web KI-043. LCP becomes an error only once CI shows both pages under 2.5 s with a margin.
- **The shelf's LCP could move to a late font** (web KI-043): fixed by preloading the body face (below); CI decides whether the shelf is now under 2.5 s.
- **The shelf's LCP has about 4% headroom on a fast machine** (2.40 s against 2.5 s here, 2.25 s in another run) and none on CI (2.46 to 2.89 s). Another 10 KB of JavaScript would cost it further.
- **No Brotli.** nginx's `alpine-slim` image has no Brotli module; Brotli would take roughly another 10% off the JavaScript.
- **HTTP/2** is not used between the browser and the container (it needs TLS); the Ingress or a CDN would add it.
- **A CDN** is not in this phase.

## Fix KI-027: the same phone everywhere, and the product page's chain shortened

Before the fix (CI, PR #48's perf run, benchmark index about 2345, constant 4x): shelf LCP **2.89 s** (runs 2.75, 2.91, 2.89), product page **2.79 s** (2.79, 2.78, 2.80; its photo waited 1947 ms of "load delay" before it was even asked for).

**1. The CPU slowdown is calibrated** (`scripts/perf-calibrate.mjs`, decisions `[Fix KI-027]`). Lighthouse's simulation multiplies the CPU time it measured on the host by the slowdown, and that time is proportional to 1 / the host's benchmark index. So the phone being simulated has the index *host index / slowdown*, and a constant 4x simulated a phone of 1100 on the reference desktop but one of about 590 on the CI runner: the runner was judging a phone nearly twice as slow. The fix holds the phone at 1100, the one the budgets were set on: slowdown = host index / 1100 (1x to 20x). Nothing changes on the reference desktop; a CI runner gets about 2.1x. By Lighthouse's own device table that phone is "high-end mobile" (800 to 1200); the 4x default on a typical desktop (1500 to 2000) aims lower, at "mid-tier mobile" (about 440). Judging that slower phone would mean about 10x on the reference desktop and 5.3x on CI, and new budgets: a decision for the owner, not part of this fix.

**2. A cold product page asks for its data from `index.html`.** A small inline script recognises `/products/:id` (the same ids the page accepts), issues the same GET the app makes (same URL, `Accept`, a fresh `X-Correlation-Id`; no token, a product read is public and a fresh page has none) and leaves the promise on `window.__ecomdemoEarly`. The API client takes it, once, instead of asking again (`src/api/earlyRequest.ts`), under its usual middleware and retry policy. When the answer names a same-origin photo, the script preloads it at high priority, and the img reuses that download. The chain becomes page, data, photo, with the app's JavaScript downloading at the same time. The Content-Security-Policy allows that one script by its sha256 hash (`docs/security.md`), checked by `npm run verify`. The price: a copy of the route (`/products/:id`) and of the request's shape lives in the HTML, and both are pinned by tests (`src/app/earlyProductRequest.test.ts` runs the shipped script; `e2e/catalog.spec.ts` checks one product request and one photo request in a real browser, under the production policy).

**What PR #49's first CI run showed, and the two corrections it led to.** The first CI run (`a31c92d`, run 38157082130) passed but barely moved LCP: shelf 2.88 s (runs 2.87, 3.11, 2.88), product page 2.77 s (2.77, 2.77, 2.86). Its log said why, twice over:

- **The calibration was warm, Lighthouse was cold.** The calibration's five samples were 2190 then 2531 to 2657 (median 2574, so 2.34x), but each Lighthouse run benchmarks in a Chrome it has just started, and those runs measured 2172 to 2232. Each run therefore simulated a phone of 920 to 955, 16% slower than the target. Now every calibration sample starts its own Chrome and takes one reading, as a Lighthouse run does. Against the nginx container here, the runs then simulated 917 to 1215 around the 1100 target.
- **The early request waited for `theme-init.js`.** The photo's load delay was still 1810 ms. Reproduced here against the real nginx image (this branch's build on the earlier image, the same stand-in API): the inline script came after `<script src="/theme-init.js">`, which blocks the parser, so it ran only once that file had arrived. Under simulated slow 4G that file shares the link with all the JavaScript and CSS, and the product request started after them (observed at 131.6 ms, after the CSS at 115 ms). `vite preview`, used for the first local measurement, happened not to show it. The script is now first in `<head>` (same text, same hash).

Measured here against the nginx image, a stand-in API with a 10 KB detailed PNG (Chrome leaves flat, low-detail images out of LCP), three runs, median. This container is busy and slow, so absolute numbers are pessimistic; the phases are the point:

| Product page | Slowdown | LCP | The photo's load delay | Its render delay |
|---|---|---|---|---|
| Inline script after `theme-init.js` | 2.1x fixed | 2.82 s | 1817 ms | 466 ms |
| Inline script first in `<head>` | 2.1x fixed | 2.72 s | **728 ms** | 1460 ms |
| First in `<head>`, calibrated (fresh-Chrome benchmark) | 1.25x | 2.63 s | 767 ms | 1500 ms |

The chain is broken: the photo is asked for about 1.1 s sooner and has arrived long before the page draws it. What is left is the page itself: the photo can only be drawn once the app's JavaScript (about 160 KB over slow 4G, render-blocking) has arrived and React has rendered, the same cost that bounds the shelf. Getting further under 2.5 s means less JavaScript before the first render, not an earlier photo.

**PR #49's second CI run** (`80e7ed3`, run 38158715384, both corrections in), compared with the run before the fix (PR #48):

| | Before (PR #48, constant 4x) | After (PR #49, calibrated) |
|---|---|---|
| CPU slowdown | 4x (index about 2345: a phone of about 590) | **1.98x** (fresh-Chrome median 2176: a phone of 1099; the runs simulated 748 to 1204) |
| Shelf LCP, median (runs) | 2.89 s (2.75, 2.91, 2.89) | **2.87 s** (2.87, 2.88, 2.87) |
| Product page LCP, median (runs) | 2.79 s (2.79, 2.78, 2.80) | **2.63 s** (2.63, 2.79, 2.63) |
| The product photo's load delay | 1947 ms | **1082 ms** |
| Performance score (shelf / product) | 92 / 92 | 93 / 94 |

**Both pages are still over 2.5 s on CI, so LCP stays a warning.** The product page gained 0.16 s, and the rest of it is render delay (928 ms), not the chain. The shelf did not move: with the calibrated slowdown CI simulates the same phone as the reference desktop, yet the shelf is 2.87 s there against the 2.25 to 2.40 s measured on that desktop **in Phase 21, on Phase 21's build** (128 KB of JavaScript; the shelf now loads 159 KB after Phases 22 to 25). So the remaining gap looks like the page, not the runner. It is recorded as **web KI-042**: the first check is `npm run perf` on the reference desktop with the current build.

## Fix KI-042: the shelf starts from fewer files, without zod, with its data already on the way

**What grew, measured.** Every merge since Phase 21 built again (`ANALYZE=1`, gzip -9 as nginx serves it), counting the files the shelf loads before it can start (the entry and what `index.html` preloads):

| Build | The shelf's first files | Lazy, but still in Lighthouse's page total |
|---|---|---|
| Phase 21 (`97d9892`) | **127.0 KB in 5 files** | |
| Phase 22 (`165402d`) | 130.5 KB, 5 files: **+3.5 KB, zod**, pulled into the entry by `import '@/app/zodConfig'` in `main.tsx` (a CSP setting, though the shelf has no form) | |
| Phase 23 (`5e5e813`) | 147.0 KB: +16.5 KB, tracing in the entry | |
| Fix KI-033 (`d57bc4b`) | 131.6 KB: tracing moved out | tracing 16.2 KB, after the first paint |
| Phase 24 (`70d64f6`) | **134.8 KB in 8 files**: the guest cart in the entry (+about 3 KB), and the new lazy cart route made rolldown split three modules the entry shares with it (`useQuery`, `useSession`, `money`) into **three more files** | tracing 16.2 KB |
| Phase 25 to KI-027 (`de40aaf`, `main`) | 135.1 KB in 8 files | tracing 16.2 KB |

So the "159 KB" Lighthouse reports for the shelf (it counts every script of the load, headers included) is 135.1 KB the shelf waits for plus the tracing chunk that comes after the first paint (web KI-033). Of the growth on the shelf's path, the part that costs most on a slow link is not bytes but **files**: 8 instead of 5, and each one is another request (Phase 21 measured exactly such a 5 to 8 split as 0.15 s later).

**The fix, in three parts** (decisions `[Fix KI-042]`):

1. **One app file.** A rolldown chunk group on rolldown's own `$initial` tag (modules the entry imports statically) keeps all of them in one file after `vendor`: the shelf starts from **3 files, 128.3 KB** (runtime, vendor, app). No lazy page's code is pulled in; the lazy chunks import from the app file as before.
2. **zod out of the entry.** `zodConfig` is imported first by the two `schemas.ts` files that build schemas, not by `main.tsx`; a unit test keeps every zod user importing it first.
3. **The shelf's data from `index.html`.** The inline script that starts a cold product page's GET (KI-027) also starts the shelf's on `/`: `GET /api/products?page=0&size=100`, the request `fetchProducts` makes first, taken once by the API client. The shelf's LCP is a product's text, which needed that answer; it was asked for only after the JavaScript had arrived and run, and now travels beside it. The CSP hash is the new script's (`check-dist` failed on the old one).

`npm run verify` now guards both regressions: `scripts/check-budgets.mjs` limits the shelf to **5 files** and fails when one of them holds zod, the forms, OpenTelemetry, tracing, or the admin, account, checkout, orders or assistant code (from `bundle-analysis/chunk-modules.json`, which every build writes). On `main`'s build it fails twice (8 files; zod in the entry).

**Measured here** (this container; the nginx image built from each build, a stand-in API serving the seed's 14 products with no photos, Lighthouse 12.6.1 at a fixed 1.88x so the builds are compared at one slowdown, ten runs each in two rounds of five, median; the container is shared and noisy, so the phases matter more than the absolute numbers). `main` measured here at **2.87 s**, the same as CI (2.87 s), with the same LCP element (a product's description):

| Shelf `/` | Scripts (as Lighthouse counts) | LCP median of 10 (the runs) |
|---|---|---|
| `main` (`de40aaf`) | 159.5 KB in 10 requests | 2.87 s (2.58 to 3.02; 8 of 10 between 2.86 and 2.88) |
| 1 + 2: one app file, no zod | 148.7 KB in 5 | 2.60 s (2.30 to 2.63) |
| 1 + 2 + 3: the shelf's data from `index.html` | 148.7 KB in 5 | **2.29 s** (1.83 to 2.88: 7 runs 1.83 to 2.31, 3 runs 2.73 to 2.88) |

A cold product page (the stand-in has no photos, so its LCP here is the `<h1>`, not the photo as on CI) gains from parts 1 and 2 (the same entry): `main` 2.88 s (2.87 to 2.98) → **2.28 s** (2.14 to 2.56), five runs each.

**What is left: the body font races the first paint (web KI-043).** With the data on its way early, the products are usually drawn in the very first paint (LCP = FCP + about 150 ms). In 3 runs of 10 they were drawn first in the fallback font and drawn again when IBM Plex Sans arrived a few milliseconds later; Chrome counts the redraw as the LCP, and Lighthouse's simulation then hangs it after the body fonts (LCP 2.73 to 2.88 s). The body face is not preloaded on purpose (Phase 21: a second preload competed with the JavaScript), so this needs a font decision, not a quick change; it decides whether a three-run median lands at about 2.3 s or about 2.8 s.

**On CI** (the verdict: PR #50, run 38208532791, `64c2722`; the calibration measured a median index of 3631, so 3.3x; the runs simulated phones of 959 to 1312):

| | Before (PR #49, 1.98x) | After (PR #50, 3.3x) |
|---|---|---|
| Shelf LCP, median (runs) | 2.87 s (2.87, 2.88, 2.87) | **2.64 s** (2.33, 2.79, 2.64) |
| Its render delay (first run) | 2419 ms | 1882 ms |
| Product page LCP, median | 2.63 s | **2.45 s** (under 2.5 s; the photo's load delay 666 ms, was 1082) |
| JavaScript (as sent) | 159 KB | 148.6 KB |
| Performance score (shelf / product) | 93 / 94 | 95 / 95 |

**The shelf is still over 2.5 s, so KI-042 stays open and LCP stays a warning** (the product page passes it). Its three runs split as the local ones did: 2.33 s, then 2.64 and 2.79 s. That spread is web KI-043, the body font's swap, which is now the main thing between the shelf and the budget.

### Web KI-043: the shelf's fonts and Lighthouse's simulation

**How the fonts loaded** (`main` at `f3e42bf`): seven faces in `src/styles/tokens.css`, all `font-display: swap`, latin subsets with the rupee sign (14 to 26 KB each), hashed by Vite into `/assets/` and served by nginx for a year (`immutable`, no ETag, no security headers); the CSP's `font-src 'self'`. `index.html` preloaded one face, Newsreader 600 (the headings; Vite rewrites the `/src/styles/fonts/...` href to the hashed file). The shelf draws six faces; the other five were asked for only when React had drawn text in them.

**What was really happening** (KI-043 guessed a fallback-then-Plex double paint; measured, it is not that). Lighthouse does not slow the page down: it loads it at full speed once, then *simulates* the slow phone ("Lantern"). For LCP the simulation takes **every request that ended before the observed LCP** and replays them on the slow link; the LCP is when the last of them would end. The fonts that are not preloaded start only after the JavaScript has run and React has drawn, and on the fast observed load they take a few milliseconds, so whether they end just before or just after the products' paint is chance. When they end before it, the simulation puts their download after the whole JavaScript chain: IBM Plex Sans (2.3 s), and in the bad runs also Plex Mono and Newsreader 500 (2.6 to 2.9 s). A real phone would have drawn the description in the fallback face and swapped; a browser test showed that a late Plex Sans makes the fallback paint the LCP (it is the larger one; the swap draws a smaller box, which is not a new LCP entry). So `font-display: optional` and a metric-matched fallback (`size-adjust`) would change nothing Lighthouse counts: they act on what is drawn, not on when the font request ends.

**The fix: preload IBM Plex Sans 400**, the face of the shelf's largest paint (a product description), beside the heading face. The HTML asks for it at once, so it downloads beside the JavaScript instead of after it, in the simulation as on a phone. The CSP needs nothing new (`font-src 'self'`, same origin); `check-dist` checks that each font preload points at a file the build emitted, has `type="font/woff2"` and `crossorigin` (fonts are fetched in CORS mode; without it the preload is a second download), and that the two faces are preloaded. No font bytes are added: the shelf loaded this face anyway (the font budget is unchanged).

**Measured here** (the nginx image of each build; a stand-in API with the seed's 14 products and the pinned backend's own eight SVG photos; Lighthouse 12.6.1 at a fixed 1.88x; ten runs per row, median and range; the container is shared, so its benchmark index wandered between about 1150 and 2100 during these runs, and the rows of one session are what compare):

| Preloaded faces | Shelf `/` LCP | Product page LCP (its photo) |
|---|---|---|
| Newsreader 600 (`main`) | 2.16 s (1.85 to 2.76; 3 runs at 2.36 or more) | 2.50 s (2.32 to 2.71) |
| + Plex Sans 400 (**the fix**) | **2.16 s (2.13 to 2.20)** | **2.41 s** (2.25 to 2.73) |
| + Plex Sans 400 and 600 | 2.15 s (2.11 to 2.61) | 2.56 s (2.26 to 2.70) |
| all six shelf faces (a separate session, a 78 KB test photo) | 2.60 s (2.56 to 2.89; `main` 2.16 there) | 3.25 s (`main` 2.91 there) |

In an earlier session without photos the fix measured 2.21 s (2.13 to 2.78) against `main`'s 2.33 s (1.85 to 2.77). Over all the sessions, a run of `main` landed at 2.5 s or more 7 times in 30; the fix, 2 in 20. The median barely moves; **what the fix removes is the tail**, and the tail is what made CI's three-run median land either side of 2.5 s. Preloading every face was clearly worse (about 120 KB on the slow link before the JavaScript): that is the Phase 21 finding, and it still holds for more than one body face.

**On CI** (the verdict): _CI numbers to fill in from this PR's perf run (run id, slowdown, shelf median and runs, product page median)._

## Running it

```bash
npm run verify                      # includes check:budgets (chunk sizes) on the fresh build
npm run perf                        # Lighthouse CI + the signed-in flows against the production container (the backend must be up)
npm run perf:analyze                # bundle-analysis/treemap.html and stats.json
node scripts/perf-report.mjs <name> # the median table of the last Lighthouse CI run in .lighthouseci/
```

`npm run perf` prints the median table and keeps `perf-results/` (git-ignored) whatever the verdict. CI runs it in the `e2e` job, which already has the backend, and uploads `perf-results/`, `.lighthouseci/` and `bundle-analysis/` as the `performance` artifact.

The tools are **dev dependencies only**: `@lhci/cli`, `lighthouse`, `puppeteer-core` and `rollup-plugin-visualizer` add nothing to the app or the image. `npm audit --omit=dev` still reports 0 vulnerabilities; `npm audit` reports advisories in the measurement tools' transitive dependencies (`extract-zip`, `tmp`, `basic-ftp`, in the browser-download path, which is not used: the scripts take a Chrome from `CHROME_PATH`, otherwise the Chromium Playwright installed).
