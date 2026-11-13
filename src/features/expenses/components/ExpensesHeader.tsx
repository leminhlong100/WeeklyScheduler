import type { ReactNode } from 'react'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
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
  /** Đang xem tháng hiện tại thì ẩn chip "Về tháng này". */
  isCurrentMonth: boolean
  /** Bấm vào tên tháng: mở bộ chọn tháng. */
  onPickMonth: () => void
  /** Bỏ trống khi đang xem sổ người khác: ẩn nút thêm. */
  onAddExpense?: () => void
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
  isCurrentMonth,
  onPickMonth,
  onAddExpense,
  userMenu,
}: ExpensesHeaderProps) {
  return (
    <header
      className="relative z-[3] flex flex-shrink-0 items-center gap-2 border-b px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top)*var(--sched-notch-scale))] sm:gap-[13px] sm:px-[22px] sm:pb-[15px] sm:pt-[15px]"
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
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          onClick={onPickMonth}
          aria-label={`${t.pickMonth}: ${monthLabel}`}
          className="font-heading flex min-h-10 min-w-0 items-center gap-1 truncate rounded-[12px] px-1.5 text-[15px] font-extrabold sm:text-[21px]"
          style={{ color: theme.text }}
        >
          <span className="truncate">{monthLabel}</span>
          <ChevronDownIcon className="size-4 flex-shrink-0 opacity-60" />
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={onThisMonth}
            className="flex min-h-9 flex-shrink-0 items-center rounded-full px-2.5 text-[12px] font-extrabold"
            style={{
              background: theme.chip,
              color: theme.accentText,
              border: `1.5px solid ${theme.border}`,
            }}
          >
            {t.backToThisMonth}
          </button>
        )}
      </div>

      {onAddExpense && (
        <GradientButton
          onClick={onAddExpense}
          aria-label={t.addTransaction}
          className="hidden h-10 gap-1.5 px-[18px] text-[13.5px] md:flex"
        >
          <PlusIcon className="size-4" />
          <span>{t.addTransaction}</span>
        </GradientButton>
      )}

      {userMenu}
    </header>
  )
}
