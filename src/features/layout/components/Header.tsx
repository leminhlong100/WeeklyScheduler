import type { ReactNode } from 'react'
import { CopyIcon, PlusIcon } from 'lucide-react'
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
  onCopyLastWeek: () => void
  copyLastWeekPending: boolean
  userMenu: ReactNode
}

function ChromeButton({
  onClick,
  theme,
  className,
  children,
  title,
  disabled,
}: {
  onClick: () => void
  theme: DerivedTheme
  className?: string
  children: ReactNode
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-10 flex-shrink-0 items-center justify-center rounded-[13px] border-[1.5px] text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50 ${className ?? 'w-10'}`}
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
  onCopyLastWeek,
  copyLastWeekPending,
  userMenu,
}: HeaderProps) {
  return (
    <header
      className="relative z-[3] flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:gap-[13px] sm:px-[22px] sm:py-[15px]"
      style={{ borderColor: theme.border, background: theme.panel }}
    >
      <ChromeButton onClick={onToggleSidebar} theme={theme} className="order-1 w-10 sm:order-1" title="Menu">
        <div
          className="h-0.5 w-[15px] rounded-full"
          style={{ background: 'currentColor', boxShadow: '0 5px 0 currentColor, 0 -5px 0 currentColor' }}
        />
      </ChromeButton>

      <div
        className="font-heading order-2 flex-1 text-[15px] font-extrabold whitespace-nowrap sm:order-3 sm:flex-initial sm:text-[21px]"
        style={{ color: theme.text }}
      >
        {weekRangeLabel}
      </div>

      <div className="order-3 sm:hidden">{userMenu}</div>

      <div className="order-5 flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 sm:order-2 sm:w-auto sm:overflow-visible">
        <ChromeButton onClick={onPrevWeek} theme={theme} className="w-10 text-lg">
          ‹
        </ChromeButton>
        <ChromeButton onClick={onNextWeek} theme={theme} className="w-10 text-lg">
          ›
        </ChromeButton>
        <ChromeButton onClick={onToday} theme={theme} className="ml-1 w-auto px-4">
          {t.today}
        </ChromeButton>
        <ChromeButton
          onClick={onCopyLastWeek}
          theme={theme}
          disabled={copyLastWeekPending}
          className="w-auto gap-1.5 px-3 sm:px-4"
        >
          <CopyIcon className="size-4" />
          <span className="hidden sm:inline">{t.copyLastWeek}</span>
        </ChromeButton>
      </div>

      <div className="order-4 hidden flex-1 sm:block" />

      <button
        type="button"
        onClick={onOpenTheme}
        className="order-6 flex h-10 w-10 flex-shrink-0 items-center justify-center gap-2 rounded-2xl border-[1.5px] text-[13.5px] font-bold sm:order-5 sm:w-auto sm:px-[15px]"
        style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
      >
        <span className="text-base leading-none">🎨</span>
        <span className="hidden sm:inline">{currentThemeName}</span>
      </button>

      <GradientButton
        onClick={onNewEvent}
        className="order-7 h-10 gap-1.5 px-3 text-[13.5px] sm:order-6 sm:px-[18px]"
      >
        <PlusIcon className="size-4" />
        <span className="hidden sm:inline">{t.newEvent}</span>
      </GradientButton>

      <div className="order-8 hidden sm:order-7 sm:block">{userMenu}</div>
    </header>
  )
}
