import { useCallback, useEffect, useState } from 'react'

/** `system` follows the operating system (no `data-theme` on <html>); the other two are the user's choice. */
export type Theme = 'system' | 'light' | 'dark'

// Also read by the inline script in index.html, which applies it before the first paint.
export const THEME_KEY = 'ecomdemo-theme'

function stored(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    // Private windows and blocked site data can throw: the choice is a convenience, so system it is.
    return 'system'
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

/** The colour theme: remembered in this browser only (localStorage), safe to lose. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(stored)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, next)
    } catch {
      // Not saved; it still applies until the tab closes.
    }
  }, [])

  return { theme, setTheme }
}
