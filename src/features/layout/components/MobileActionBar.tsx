import type { ReactNode } from 'react'
import { CopyIcon, EllipsisIcon, PlusIcon } from 'lucide-react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { GradientButton } from '@/components/common/GradientButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MobileActionBarProps {
  theme: DerivedTheme
  t: Dictionary
  currentThemeName: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onOpenTheme: () => void
  onNewEvent: () => void
  onCopyLastWeek: () => void
  copyLastWeekPending: boolean
  onToggleStickerPanel: () => void
}

function BarButton({
  onClick,
  theme,
  className,
  children,
  label,
}: {
  onClick: () => void
  theme: DerivedTheme
  className?: string
  children: ReactNode
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 flex-shrink-0 items-center justify-center rounded-[14px] border-[1.5px] text-[13px] font-bold transition-transform duration-150 active:scale-95 ${className ?? 'w-11'}`}
      style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
    >
      {children}
    </button>
  )
}

/**
 * Mobile-only bottom action bar: week navigation, an overflow menu for
 * secondary actions and the "new event" FAB. Replaces the desktop header
 * toolbar below the `sm` breakpoint; padded for the home-indicator safe area.
 */
export function MobileActionBar({
  theme,
  t,
  currentThemeName,
  onPrevWeek,
  onNextWeek,
  onToday,
  onOpenTheme,
  onNewEvent,
  onCopyLastWeek,
  copyLastWeekPending,
  onToggleStickerPanel,
}: MobileActionBarProps) {
  return (
    <nav
      className="relative z-[60] flex flex-shrink-0 items-center gap-2 border-t px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:hidden"
      style={{ borderColor: theme.border, background: theme.panel }}
    >
      <BarButton onClick={onPrevWeek} theme={theme} className="w-11 text-lg">
        ‹
      </BarButton>
      <BarButton onClick={onToday} theme={theme} className="w-auto px-4">
        {t.today}
      </BarButton>
      <BarButton onClick={onNextWeek} theme={theme} className="w-11 text-lg">
        ›
      </BarButton>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] border-[1.5px] outline-none transition-transform duration-150 active:scale-95"
          style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
        >
          <EllipsisIcon className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCopyLastWeek} disabled={copyLastWeekPending}>
            <CopyIcon className="size-4" />
            {t.copyLastWeek}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenTheme}>
            <span className="text-base leading-none">🎨</span>
            {currentThemeName}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleStickerPanel}>
            <span className="text-base leading-none">🌈</span>
            {t.stickers}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GradientButton onClick={onNewEvent} aria-label={t.newEvent} className="h-11 w-11 rounded-full p-0">
        <PlusIcon className="size-5" />
      </GradientButton>
    </nav>
  )
}
