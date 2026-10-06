import { Button } from '@/components/Button'
import { useTheme, type Theme } from './useTheme'

const order: Theme[] = ['system', 'light', 'dark']
const names: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }

/** One button that steps through Auto (the system setting), Light and Dark. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = order[(order.indexOf(theme) + 1) % order.length] ?? 'system'
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={`Theme: ${names[theme]}. Switch to ${names[next].toLowerCase()}.`}
      onClick={() => setTheme(next)}
    >
      {`Theme: ${names[theme]}`}
    </Button>
  )
}
