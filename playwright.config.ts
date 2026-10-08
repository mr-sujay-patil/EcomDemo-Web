import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:4173'

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // No retries locally: a flaky test should fail loudly. CI (Phase 5) retries, and the retry records a trace.
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Pictures are compared exactly (e2e/visual.spec.ts): animations stopped, the text caret hidden, no tolerance for a stray pixel.
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 } },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // The smoke suite: everything except the screenshot generator.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@report/ },
    // `npm run e2e:report` only: writes screenshots into docs/test-reports/, so it never runs by default.
    { name: 'report', use: { ...devices['Desktop Chrome'] }, grep: /@report/ },
  ],
  // The production build, served the way users get it; `preview` proxies /api to the gateway (API_TARGET).
  webServer: {
    // VITE_STYLEGUIDE=true puts the /styleguide route in this build (src/app/router.tsx); the production build has none.
    command: 'VITE_STYLEGUIDE=true npm run build && npm run preview',
    url: baseURL,
    // Never test a stale build left running on 4173: fail on the busy port instead.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
