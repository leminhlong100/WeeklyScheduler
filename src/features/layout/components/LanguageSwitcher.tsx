import { LOCALES, type Locale } from '@/features/i18n/types'
import type { DerivedTheme } from '@/features/theme/types'

const LABELS: Record<Locale, string> = { vi: 'VI', en: 'EN', zh: '中', ja: '日' }

interface LanguageSwitcherProps {
  locale: Locale
  onChange: (locale: Locale) => void
  theme: DerivedTheme
}

export function LanguageSwitcher({ locale, onChange, theme }: LanguageSwitcherProps) {
  return (
    <div className="flex gap-1.5">
      {LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className="flex-1 rounded-xl border-none py-2 text-[12.5px] font-extrabold transition-all"
            style={{
              background: active ? '#ffffff' : 'rgba(255,255,255,.16)',
              color: active ? theme.accent : '#ffffff',
            }}
          >
            {LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
