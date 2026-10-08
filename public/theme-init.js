// Applies a saved Light or Dark choice before the first paint, so the page does not flash the other theme.
// A file of its own (not an inline <script>) so the Content-Security-Policy can say `script-src 'self'` with no exceptions.
// Same key as src/app/useTheme.ts.
try {
  var theme = localStorage.getItem('ecomdemo-theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch (error) {}
