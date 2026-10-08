// Lighthouse for the pages that need a signed-in person: the cart and an order page.
//
// Lighthouse CI loads a URL cold, and a page load ends the session (it lives in memory, by design: docs/architecture), so
// /cart and /orders/<id> cannot be loaded signed in. This opens the shop in Chrome, signs in with a real account, and measures
// the two moves a person makes with Lighthouse's user-flow "timespan": the click on Cart, and the click on Place order through to
// the order being confirmed. A timespan has no LCP (that is for a page load); it reports what happens in the move: layout
// shift (CLS), blocking time (TBT) and the delay of the click itself (INP).
//
// `node scripts/perf-flows.mjs` (the web container and the backend must be up; CHROME_PATH names a Chrome). Three runs, mobile,
// throttled as Lighthouse's mobile preset; the median of each metric is judged against the budgets below, and the script exits
// 1 if one is broken. Writes perf-results/flows.json and perf-results/flows.md.
import { mkdirSync, writeFileSync } from 'node:fs'
import { startFlow } from 'lighthouse'
import puppeteer from 'puppeteer-core'

const base = process.env.PERF_BASE_URL ?? 'http://localhost:8070'
const chrome = process.env.CHROME_PATH
const runs = Number(process.env.PERF_RUNS ?? 3)
if (!chrome) throw new Error('CHROME_PATH must point at a Chrome or Chromium binary.')

// The same budgets as the cold pages where a timespan has the metric, and Core Web Vitals "good" for the interaction.
const budgets = { cls: 0.1, tbt: 200, inp: 200 }

const password = 'correct horse battery'
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

async function register() {
  const username = `perf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const response = await fetch(`${base}/api/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ username, password, fullName: 'Perf Person' }),
  })
  if (response.status !== 201) throw new Error(`Could not register a customer: ${response.status}`)
  return username
}

/** Clicks the first element of `selector` whose text matches `text` (an exact match, or a start with `^`). */
async function clickText(page, selector, text) {
  await page.waitForFunction(
    ([sel, wanted]) =>
      [...document.querySelectorAll(sel)].some((el) =>
        wanted.startsWith('^') ? el.textContent.trim().startsWith(wanted.slice(1)) : el.textContent.trim() === wanted,
      ),
    {},
    [selector, text],
  )
  await page.evaluate(
    ([sel, wanted]) => {
      const el = [...document.querySelectorAll(sel)].find((candidate) =>
        wanted.startsWith('^')
          ? candidate.textContent.trim().startsWith(wanted.slice(1))
          : candidate.textContent.trim() === wanted,
      )
      el.click()
    },
    [selector, text],
  )
}

/** Like clickText, but the click is a real input event. */
async function realClickText(page, selector, text) {
  const handle = await page.waitForFunction(
    ([sel, wanted]) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim() === wanted) ?? null,
    {},
    [selector, text],
  )
  await handle.asElement().click()
}

const flowFlags = {
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  // A timespan cannot be simulated after the fact: the browser itself is slowed (4x CPU, slow 4G), as in Lighthouse's mobile preset.
  throttlingMethod: 'devtools',
  onlyCategories: ['performance'],
}

async function oneRun() {
  const username = await register()
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true })

    // Getting signed in and holding something in the cart is set-up, not the thing measured.
    await page.goto(`${base}/sign-in`, { waitUntil: 'networkidle0' })
    await page.type('input[name="username"]', username)
    await page.type('input[name="password"]', password)
    await clickText(page, 'button', 'Sign in')
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some((b) => b.getAttribute('aria-label')?.startsWith('Account:')),
    )
    await page.waitForFunction(() =>
      [...document.querySelectorAll('article')].some((a) => a.textContent.includes('Desk Mat')),
    )
    // The usual way to the cart: open a product from the shelf, add it there. (Opening the cart straight from the tall shelf
    // scores higher, because the footer, the one element that stays, moves a long way when the page gets shorter: docs/performance.md.)
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('article')].find((a) => a.textContent.includes('Desk Mat'))
      card.querySelector('h2 a').click()
    })
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Desk Mat')
    await clickText(page, 'main button', 'Add to cart')
    await page.waitForFunction(() =>
      [...document.querySelectorAll('main button')].some((b) => b.textContent.trim() === 'In your cart (1)'),
    )

    const flow = await startFlow(page, { flags: flowFlags })

    await flow.startTimespan({ name: 'Open the cart' })
    // A real click (the browser's own input event), so the interaction's latency (INP) is measured; `element.click()` is not one.
    await (await page.$('header a[aria-label^="Cart"]')).click()
    await page.waitForFunction(
      () =>
        document.querySelector('h1')?.textContent === 'Your cart' &&
        document.body.textContent.includes('Order summary'),
    )
    await flow.endTimespan()

    await flow.startTimespan({ name: 'Place the order, and watch it confirmed' })
    await realClickText(page, 'button', 'Place order')
    await page.waitForFunction(
      () => location.pathname.startsWith('/orders/') && document.body.textContent.includes('Your order is confirmed.'),
      { timeout: 60_000 },
    )
    await flow.endTimespan()

    const result = await flow.createFlowResult()
    return result.steps.map((step) => ({
      name: step.name,
      cls: step.lhr.audits['cumulative-layout-shift']?.numericValue ?? 0,
      tbt: step.lhr.audits['total-blocking-time']?.numericValue ?? 0,
      inp: step.lhr.audits['interaction-to-next-paint']?.numericValue ?? 0,
      shifts: (step.lhr.audits['layout-shifts']?.details?.items ?? []).map(
        (item) => `${item.score.toFixed(3)} ${item.node?.snippet?.slice(0, 80) ?? ''}`,
      ),
      script:
        step.lhr.audits['resource-summary']?.details?.items?.find((item) => item.resourceType === 'script')
          ?.transferSize ?? 0,
    }))
  } finally {
    await browser.close()
  }
}

const all = []
for (let run = 1; run <= runs; run += 1) {
  console.log(`Run ${run} of ${runs}...`)
  all.push(await oneRun())
}

const steps = all[0].map((step, index) => ({
  name: step.name,
  runs: all.length,
  cls: median(all.map((run) => run[index].cls)),
  tbt: median(all.map((run) => run[index].tbt)),
  inp: median(all.map((run) => run[index].inp)),
  script: median(all.map((run) => run[index].script)),
  // What moved, from the first run: the largest shifts, to know where to look.
  shifts: all[0][index].shifts.slice(0, 3),
}))

const lines = [
  `Lighthouse user flow, signed in, mobile, 4x CPU and slow 4G applied in the browser; median of ${runs} runs`,
  '',
  '| Move | Runs | CLS | TBT | INP | JavaScript fetched |',
  '|---|---|---|---|---|---|',
  ...steps.map(
    (s) =>
      `| ${s.name} | ${s.runs} | ${s.cls.toFixed(3)} | ${Math.round(s.tbt)} ms | ${Math.round(s.inp)} ms | ${(s.script / 1024).toFixed(1)} KB |`,
  ),
]
console.log(lines.join('\n'))
mkdirSync('perf-results', { recursive: true })
writeFileSync('perf-results/flows.json', JSON.stringify({ budgets, steps, runs: all }, null, 2))
writeFileSync('perf-results/flows.md', `${lines.join('\n')}\n`)

for (const step of steps)
  if (step.shifts.length > 0) console.log(`Shifts in "${step.name}" (run 1): ${step.shifts.join(' | ')}`)

const broken = steps.flatMap((s) =>
  Object.entries(budgets)
    .filter(([metric]) => s[metric] > budgets[metric])
    .map(([metric]) => `${s.name}: ${metric} ${s[metric]} is over the budget of ${budgets[metric]}`),
)
if (broken.length > 0) {
  console.error(`Budgets broken:\n  ${broken.join('\n  ')}`)
  process.exit(1)
}
console.log('All flow budgets pass.')
