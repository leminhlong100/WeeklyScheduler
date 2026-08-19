import type { ReactNode } from 'react'
import { PlusIcon } from 'lucide-react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { GradientButton } from '@/components/common/GradientButton'

interface ExpensesHeaderProps {
  theme: DerivedTheme
  t: Dictionary
  monthLabel: string
  onToggleSidebar: () => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onThisMonth: () => void
  onAddExpense: () => void
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
      className={`flex h-10 flex-shrink-0 items-center justify-center rounded-[13px] border-[1.5px] text-[13px] font-bold transition-transform duration-150 active:scale-95 ${className ?? 'w-10'}`}
      style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
    >
      {children}
    </button>
  )
}

/**
 * Thanh trên của trang chi tiêu. Cố ý không dùng lại `layout/Header`: header đó
 * mang toàn hành động của lịch tuần (đổi tuần, copy tuần trước, thống kê tuần),
 * nhồi thêm nhánh "trang nào" vào nó sẽ khó đọc hơn là hai header nhỏ.
 */
export function ExpensesHeader({
  theme,
  t,
  monthLabel,
  onToggleSidebar,
  onPrevMonth,
  onNextMonth,
  onThisMonth,
  onAddExpense,
  userMenu,
}: ExpensesHeaderProps) {
  return (
    <header
      className="relative z-[3] flex flex-shrink-0 items-center gap-2 border-b px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] sm:gap-[13px] sm:px-[22px] sm:pb-[15px] sm:pt-[15px]"
      style={{ borderColor: theme.border, background: theme.panel }}
    >
      <ChromeButton onClick={onToggleSidebar} theme={theme} title="Menu">
        <div
          className="h-0.5 w-[15px] rounded-full"
          style={{
            background: 'currentColor',
            boxShadow: '0 5px 0 currentColor, 0 -5px 0 currentColor',
          }}
        />
      </ChromeButton>

      <ChromeButton onClick={onPrevMonth} theme={theme} className="w-10 text-lg">
        ‹
      </ChromeButton>
      <ChromeButton onClick={onNextMonth} theme={theme} className="w-10 text-lg">
        ›
      </ChromeButton>
      <ChromeButton onClick={onThisMonth} theme={theme} className="hidden w-auto px-4 sm:flex">
        {t.today}
      </ChromeButton>

      <div
        className="font-heading min-w-0 flex-1 truncate text-[15px] font-extrabold sm:text-[21px]"
        style={{ color: theme.text }}
      >
        {monthLabel}
      </div>

      <GradientButton
        onClick={onAddExpense}
        aria-label={t.addExpense}
        className="h-10 gap-1.5 px-3 text-[13.5px] sm:px-[18px]"
      >
        <PlusIcon className="size-4" />
        <span className="hidden sm:inline">{t.addExpense}</span>
      </GradientButton>

      {userMenu}
    </header>
  )
}
