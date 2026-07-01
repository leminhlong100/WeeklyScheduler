import type { ReactNode } from 'react'
import { PlusIcon } from 'lucide-react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { GradientButton } from '@/components/common/GradientButton'

interface HeaderProps {
  theme: DerivedTheme
  t: Dictionary
  weekRangeLabel: string
  currentThemeName: string
  onToggleSidebar: () => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onOpenTheme: () => void
  onNewEvent: () => void
  userMenu: ReactNode
}

function ChromeButton({
  onClick,
  theme,
  className,
  children,
  title,
}: {
  onClick: () => void
  theme: DerivedTheme
  className?: string
  children: ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-10 flex-shrink-0 place-items-center rounded-[13px] border-[1.5px] text-[13px] font-bold ${className ?? 'w-10'}`}
      style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
    >
      {children}
    </button>
  )
}

export function Header({
  theme,
  t,
  weekRangeLabel,
  currentThemeName,
  onToggleSidebar,
  onPrevWeek,
  onNextWeek,
  onToday,
  onOpenTheme,
  onNewEvent,
  userMenu,
}: HeaderProps) {
  return (
    <header
      className="relative z-[3] flex flex-shrink-0 flex-wrap items-center gap-[13px] border-b px-[22px] py-[15px]"
      style={{ borderColor: theme.border, background: theme.panel }}
    >
      <ChromeButton onClick={onToggleSidebar} theme={theme} title="Menu">
        <div
          className="h-0.5 w-[15px] rounded-full"
          style={{ background: 'currentColor', boxShadow: '0 5px 0 currentColor, 0 -5px 0 currentColor' }}
        />
      </ChromeButton>

      <div className="flex items-center gap-1.5">
        <ChromeButton onClick={onPrevWeek} theme={theme} className="w-10 text-lg">
          ‹
        </ChromeButton>
        <ChromeButton onClick={onNextWeek} theme={theme} className="w-10 text-lg">
          ›
        </ChromeButton>
        <ChromeButton onClick={onToday} theme={theme} className="ml-1 w-auto px-4">
          {t.today}
        </ChromeButton>
      </div>

      <div className="font-heading text-[21px] font-extrabold whitespace-nowrap" style={{ color: theme.text }}>
        {weekRangeLabel}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenTheme}
        className="flex h-10 items-center gap-2 rounded-2xl border-[1.5px] px-[15px] text-[13.5px] font-bold"
        style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
      >
        <span className="text-base leading-none">🎨</span>
        {currentThemeName}
      </button>

      <GradientButton onClick={onNewEvent} className="h-10 gap-1.5 px-[18px] text-[13.5px]">
        <PlusIcon className="size-4" />
        {t.newEvent}
      </GradientButton>

      {userMenu}
    </header>
  )
}
