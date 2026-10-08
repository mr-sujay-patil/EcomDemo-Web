/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
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
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
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
        thresholds: { statements: 99.89, branches: 97.6, functions: 100, lines: 100 },
      },
    },
  }
})
