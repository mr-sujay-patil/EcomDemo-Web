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
    '/api': { target: apiTarget, changeOrigin: true },
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
        thresholds: { statements: 98.02, branches: 89.77, functions: 100, lines: 99.21 },
      },
    },
  }
})
