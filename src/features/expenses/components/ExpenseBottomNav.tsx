import {
  BarChart3Icon,
  HomeIcon,
  ListIcon,
  MenuIcon,
  PlusIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import type { ExpenseView } from '../hooks/useExpensesUrlState'

interface Props {
  view: ExpenseView
  onChange: (view: ExpenseView) => void
  /** Bỏ trống khi chỉ được xem (sổ người khác): nút + biến thành chỗ trống giữ bố cục. */
  onAdd?: () => void
}

/**
 * Thanh dưới riêng của module Chi tiêu (chỉ trên mobile, < md). Lịch tuần có
 * `MobileActionBar` riêng; dùng chung một thanh sẽ ra hai thanh ở trang `/`.
 *
 * 4 tab có chữ + nút ＋ nổi ở giữa — bố cục mà gần như mọi app quản lý tiền
 * dùng, nên người dùng không phải học lại.
 */
export function ExpenseBottomNav({ view, onChange, onAdd }: Props) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const item = (key: ExpenseView, label: string, Icon: LucideIcon) => {
    const active = view === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        aria-current={active ? 'page' : undefined}
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold transition-transform active:scale-95"
        style={{ color: active ? theme.accent : theme.mutedText }}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.6 : 2} />
        {label}
      </button>
    )
  }

  return (
    <nav
      aria-label={t.navExpenses}
      className="relative z-[60] flex flex-shrink-0 items-stretch border-t px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ background: theme.panel, borderColor: theme.border }}
    >
      {item('overview', t.navOverview, HomeIcon)}
      {item('transactions', t.navTransactions, ListIcon)}
      <div className="flex flex-1 items-start justify-center">
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label={t.addTransaction}
            className="-mt-5 grid size-14 place-items-center rounded-full text-white shadow-lg transition-transform active:scale-95"
            style={{ background: theme.brandGrad, boxShadow: `0 8px 20px ${theme.brandShadow}` }}
          >
            <PlusIcon className="size-7" strokeWidth={2.6} />
          </button>
        ) : null}
      </div>
      {item('report', t.navReport, BarChart3Icon)}
      {item('more', t.navMore, MenuIcon)}
    </nav>
  )
}

/** Cùng 4 tab cho desktop (≥ md): một hàng tab có chữ ngay đầu nội dung. */
export function ExpenseTopNav({ view, onChange }: Omit<Props, 'onAdd'>) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const tabs: Array<[ExpenseView, string, LucideIcon]> = [
    ['overview', t.navOverview, HomeIcon],
    ['transactions', t.navTransactions, ListIcon],
    ['report', t.navReport, BarChart3Icon],
    ['more', t.navMore, MenuIcon],
  ]
  return (
    <nav
      aria-label={t.navExpenses}
      className="hidden gap-1 rounded-[14px] border-[1.5px] p-1 md:flex"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      {tabs.map(([key, label, Icon]) => {
        const active = view === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={active ? 'page' : undefined}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-extrabold transition-transform active:scale-[0.98]"
            style={{
              background: active ? theme.accent : 'transparent',
              color: active ? '#fff' : theme.mutedText,
            }}
          >
            <Icon className="size-4" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
