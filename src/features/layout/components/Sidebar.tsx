import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import type { Locale } from '@/features/i18n/types'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { DecorBackground } from './DecorBackground'
import { LanguageSwitcher } from './LanguageSwitcher'

export interface CategorySidebarItem {
  id: string
  emoji: string
  label: string
  color: string
  count: number
  active: boolean
}

interface SidebarProps {
  open: boolean
  theme: DerivedTheme
  t: Dictionary
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onClose: () => void
  miniCalendar: ReactNode
  categories: CategorySidebarItem[]
  onToggleCategory: (id: string) => void
  onManageCategories: () => void
}

export function Sidebar({
  open,
  theme,
  t,
  locale,
  onLocaleChange,
  onClose,
  miniCalendar,
  categories,
  onToggleCategory,
  onManageCategories,
}: SidebarProps) {
  const isMobile = useIsMobile()

  return (
    <>
      {isMobile && (
        <div
          onClick={onClose}
          className={cn(
            'fixed inset-0 z-[65] bg-black/45 transition-opacity duration-300 md:hidden',
            open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        />
      )}
      <aside
        inert={isMobile && !open}
        aria-hidden={isMobile && !open}
        className={cn(
          'overflow-hidden text-white',
          isMobile
            ? 'fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-[300px] shadow-2xl transition-transform duration-300'
            : 'relative flex-shrink-0 transition-[width] duration-300',
          isMobile && (open ? 'translate-x-0' : '-translate-x-full'),
        )}
        style={{ width: isMobile ? undefined : open ? '328px' : '0px', background: theme.sideGrad }}
      >
        <DecorBackground theme={theme} variant="sidebar" />

        <div className="relative z-10 flex h-full w-full flex-col justify-center gap-5 overflow-y-auto px-5 py-[22px] pb-7">
          <div className="flex items-center gap-[11px]">
            <div
              className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-[15px] shadow-lg"
              style={{ background: 'rgba(255,255,255,.92)' }}
            >
              <img src="/favicon.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-heading text-[19px] font-extrabold leading-tight">{t.appName}</div>
              <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>
                {t.appSub}
              </div>
            </div>
            {isMobile && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-white/16"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          <LanguageSwitcher locale={locale} onChange={onLocaleChange} theme={theme} />

          {miniCalendar}

          <div>
            <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white/78">
              {t.categories}
            </div>
            <div className="flex flex-col gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCategory(c.id)}
                  className="flex items-center gap-2.5 rounded-2xl border-none bg-white/13 px-[11px] py-2.5 text-left transition-opacity"
                  style={{ opacity: c.active ? 1 : 0.42 }}
                >
                  <span className="flex-shrink-0 text-base">{c.emoji}</span>
                  <span className="flex-1 text-[13.5px] font-bold">{c.label}</span>
                  <span
                    className="min-w-[22px] rounded-lg bg-white/25 px-[5px] py-px text-center text-xs font-extrabold"
                  >
                    {c.count}
                  </span>
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-xs font-semibold text-white/78">{t.noCategories}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onManageCategories}
              className="mt-2.5 text-xs font-bold text-white/90 underline-offset-2 hover:underline"
            >
              {t.manageCategories}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
