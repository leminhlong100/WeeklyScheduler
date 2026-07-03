import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemeKey } from './types'
import { THEME_KEYS } from './types'
import { getThemeDefinition } from './themes'
import { deriveTheme } from './deriveTheme'
import type { DerivedTheme } from './types'

const STORAGE_KEY = 'weeklyScheduler.theme'

function isThemeKey(value: string): value is ThemeKey {
  return (THEME_KEYS as readonly string[]).includes(value)
}

function readStoredThemeKey(): ThemeKey {
  if (typeof window === 'undefined') return 'lavender'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && isThemeKey(stored) ? stored : 'lavender'
}

interface ThemeContextValue {
  themeKey: ThemeKey
  setThemeKey: (key: ThemeKey) => void
  theme: DerivedTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(readStoredThemeKey)

  const setThemeKey = (next: ThemeKey) => {
    setThemeKeyState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const theme = useMemo(() => deriveTheme(getThemeDefinition(themeKey)), [themeKey])
  const value = useMemo(() => ({ themeKey, setThemeKey, theme }), [themeKey, theme])

  // Keeps the iOS/Android chrome (status bar, task switcher card) tinted to
  // match whichever theme is active, instead of the static color in index.html.
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = theme.accent
  }, [theme.accent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
