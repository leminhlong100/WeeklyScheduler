import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { LOCALES, type Locale } from './types'
import { dictionaries } from './dictionaries'

const STORAGE_KEY = 'weeklyScheduler.locale'

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'vi'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && isLocale(stored) ? stored : 'vi'
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const value = useMemo(() => ({ locale, setLocale }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}

export function useTranslation() {
  const { locale, setLocale } = useLocale()
  return { t: dictionaries[locale], locale, setLocale }
}
