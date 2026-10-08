/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Reads the shell environment and .env files. Only VITE_* variables ever reach the browser;
  // API_TARGET stays here in the config.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_TARGET ?? 'http://localhost:8080'

  // The browser only talks to its own origin; /api is forwarded to the gateway, so no CORS
  // preflight is ever sent (web KI-001, backend KI-041). Used by both dev and preview.
  const proxy: Record<string, ProxyOptions> = {
    // `changeOrigin` stays off on purpose: the gateway lets a browser write (POST, PUT, DELETE: the request carries an
    // `Origin`) only when `Host` matches that `Origin`, and rewriting `Host` to the target made every write a 403
    // (found in Phase 10, registration). Reads carry no `Origin`, so they never showed it.
    '/api': { target: apiTarget },
  }

  return {
    plugins: [
      react(),
      // `ANALYZE=1 npm run build` writes the bundle's treemap and its raw numbers to bundle-analysis/ (git-ignored, a CI artifact).
      // A dev dependency only: nothing of it reaches the app.
      ...(env.ANALYZE
        ? [
            visualizer({ filename: 'bundle-analysis/treemap.html', template: 'treemap', gzipSize: true }),
            visualizer({ filename: 'bundle-analysis/stats.json', template: 'raw-data', gzipSize: true }),
          ]
        : []),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          // React and the router are the bulk of the JavaScript and change only when they are upgraded. One chunk of their own
          // stays under the 100 KB limit (scripts/check-budgets.mjs) and in the browser's cache across deploys of the app's own
          // code. One, not two: on a slow link every extra file is another round trip (two chunks made the first paint 0.15 s later).
          advancedChunks: {
            groups: [
              { name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|react-router|@remix-run)[\\/]/ },
            ],
          },
        },
      },
    },
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
    // Vitest reads this same file, so tests resolve `@/` and compile JSX exactly like the app.
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx'],
        // A floor, not a target: set to the measured values; later phases raise them, never lower them.
        thresholds: { statements: 99.9, branches: 98, functions: 100, lines: 100 },
      },
    },
  }
})
