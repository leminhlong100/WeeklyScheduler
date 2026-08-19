import { useMemo } from 'react'
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { formatMoney } from '@/lib/utils/formatMoney'
import type { Currency } from '@/lib/supabase/database.types'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useExpensesForMonth } from '../hooks/useExpenses'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'
import { shiftMonth, type MonthKey } from '../utils/month'
import { buildMonthlyReport, UNCATEGORIZED } from '../utils/report'

/** Dưới nửa phần trăm thì coi như đứng yên — "tăng 0%" đọc như một lỗi. */
const FLAT_THRESHOLD = 0.005

const OVER_BUDGET_COLOR = '#d93a3a'
const UNDER_BUDGET_COLOR = '#2fc39a'

function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

function ChangeLine({
  change,
  t,
  theme,
}: {
  change: number | null
  t: Dictionary
  theme: DerivedTheme
}) {
  if (change === null) {
    return (
      <span className="text-[11.5px] font-semibold" style={{ color: theme.muted }}>
        {t.reportNoPrevMonth}
      </span>
    )
  }

  if (Math.abs(change) < FLAT_THRESHOLD) {
    return (
      <span className="text-[11.5px] font-semibold" style={{ color: theme.muted }}>
        {t.reportFlat}
      </span>
    )
  }

  const up = change > 0
  const Icon = up ? TrendingUpIcon : TrendingDownIcon
  // Tiêu nhiều hơn tô đỏ, ít hơn tô xanh — ngược quy ước của biểu đồ doanh thu,
  // vì ở đây "tăng" mới là tin xấu.
  const color = up ? OVER_BUDGET_COLOR : UNDER_BUDGET_COLOR

  return (
    <span className="flex items-center gap-1 text-[11.5px] font-bold" style={{ color }}>
      <Icon className="size-3.5" />
      {up ? '+' : '−'}
      {percent(Math.abs(change))}
      <span className="font-semibold" style={{ color: theme.muted }}>
        {t.reportVsPrevMonth}
      </span>
    </span>
  )
}

interface CategoryLineProps {
  categoryId: string
  total: number
  share: number
  currency: Currency
  /** `undefined` khi danh mục đã bị xoá, hoặc khi đây là nhóm chưa phân loại. */
  category: ExpenseCategory | undefined
}

function CategoryLine({ categoryId, total, share, currency, category }: CategoryLineProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const name = category ? translateExpenseCategoryName(category.name, t) : t.expenseUncategorized

  // Hạn mức chỉ đối chiếu trong đơn vị tiền mặc định — xem chú thích ở
  // DEFAULT_CURRENCY: cột monthly_budget không mang currency.
  const budget =
    currency === DEFAULT_CURRENCY && category?.monthly_budget != null
      ? category.monthly_budget
      : null
  const overBudget = budget !== null && total > budget
  const budgetColor = overBudget ? OVER_BUDGET_COLOR : theme.muted

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px]">
          {categoryId === UNCATEGORIZED ? '❔' : (category?.emoji ?? '❔')}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-bold"
          style={{ color: theme.text }}
        >
          {name}
        </span>
        <span
          className="flex-shrink-0 text-[11.5px] font-bold tabular-nums"
          style={{ color: theme.muted }}
        >
          {percent(share)}
        </span>
        <span
          className="flex-shrink-0 text-[13px] font-extrabold tabular-nums"
          style={{ color: theme.text }}
        >
          {formatMoney(total, currency, locale)}
        </span>
      </div>

      {/* Thanh tỉ lệ trên tổng tháng — độ dài đọc nhanh hơn con số %. Sàn 2% để
          danh mục rất nhỏ vẫn còn một vệt nhìn thấy được. */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: theme.inputBg }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(share * 100, 2)}%`,
            background: category?.color ?? theme.muted,
          }}
        />
      </div>

      {budget !== null && (
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-bold" style={{ color: budgetColor }}>
              {overBudget ? t.reportOverBudget : t.reportBudget}
            </span>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: budgetColor }}>
              {formatMoney(total, currency, locale)} / {formatMoney(budget, currency, locale)}
            </span>
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ background: theme.inputBg }}
          >
            <div
              className="h-full rounded-full"
              style={{
                // Chặn ở 100%: vượt hạn mức thì thanh đầy và đổi màu, không tràn
                // ra ngoài khung.
                width: `${Math.min(total / budget, 1) * 100}%`,
                background: overBudget ? OVER_BUDGET_COLOR : theme.accent,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Báo cáo của tháng đang xem: mỗi đơn vị tiền một khối riêng, gồm tổng, mức so
 * với tháng trước và tỉ lệ từng danh mục.
 *
 * Tháng lấy từ trang chứ không có bộ chọn riêng — hai bộ chọn tháng trên cùng
 * một màn hình thì sớm muộn cũng lệch nhau và người đọc không biết tin cái nào.
 */
export function MonthlyReport({ month }: { month: MonthKey }) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const { data: expenses = [] } = useExpensesForMonth(month)
  // Tháng trước là một query key khác nên có cache riêng: lùi một tháng rồi quay
  // lại không phải fetch thêm lần nào.
  const { data: previousExpenses = [] } = useExpensesForMonth(shiftMonth(month, -1))
  const { data: categories = [] } = useExpenseCategories()

  const reports = useMemo(
    () => buildMonthlyReport(expenses, previousExpenses),
    [expenses, previousExpenses],
  )
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  )

  if (expenses.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm font-semibold" style={{ color: theme.muted }}>
        {t.reportNoData}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => (
        <section
          key={report.currency}
          className="flex flex-col gap-3.5 rounded-2xl border-[1.5px] p-3.5"
          style={{ borderColor: theme.border, background: theme.chip }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div>
              <div
                className="text-[11px] font-extrabold uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                {t.expenseMonthTotal}
              </div>
              <div
                className="font-heading text-[20px] font-extrabold tabular-nums"
                style={{ color: theme.text }}
              >
                {formatMoney(report.total, report.currency, locale)}
              </div>
            </div>
            <ChangeLine change={report.change} t={t} theme={theme} />
          </div>

          <div className="flex flex-col gap-3">
            {report.categories.map((row) => (
              <CategoryLine
                key={row.categoryId}
                categoryId={row.categoryId}
                total={row.total}
                share={row.share}
                currency={report.currency}
                category={categoryById.get(row.categoryId)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
