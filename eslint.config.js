// ESLint flat config: one array, applied top to bottom; later entries override earlier ones for the files they match.
import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import playwright from 'eslint-plugin-playwright'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // design-system/ is the supplied component library, kept as delivered; Phase 9 decides how the app uses it.
  globalIgnores(['dist/', 'coverage/', 'playwright-report/', 'test-results/', 'design-system/']),

  // Every file: ESLint's and typescript-eslint's recommended rules, the type-aware ones included.
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      // The project service reads tsconfig.json (and its references) the way the editor does, so the
      // rules see the same types `tsc -b` checks.
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A promise nobody awaits or catches fails silently; mark a deliberate one with `void`.
      '@typescript-eslint/no-floating-promises': 'error',
      // `any` switches type checking off, and it spreads to everything it touches.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },

  // The app runs in the browser: React hooks rules, accessibility rules for JSX.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      // Named here, although recommended already sets it, because it is the rule that finds stale effects.
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // Tests and the E2E suite may log: the smoke run prints the backend tag it ran against.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: { 'no-console': 'off' },
  },

  // The E2E suite: Playwright's rules (missing awaits on expect, focused or skipped tests, and so on).
  {
    files: ['e2e/**'],
    extends: [playwright.configs['flat/recommended']],
    languageOptions: { globals: globals.node },
    rules: {
      // A screen's `ready(page)` (e2e/screens.ts) is made of `expect` calls, so a test that awaits it asserts.
      'playwright/expect-expect': ['error', { assertFunctionNames: ['ready'] }],
    },
  },

  // Tool configs run in Node.
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  // This file is plain JavaScript outside every tsconfig, so it gets no type information.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Last: turn off every rule that would fight Prettier over formatting.
  prettier,
])
