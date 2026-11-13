import { QueryStatus } from './QueryStatus'
import { ExpenseDonut } from './ExpenseDonut'
import { useMemo } from 'react'
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { Locale } from '@/features/i18n/types'
import type { DerivedTheme } from '@/features/theme/types'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { formatMoney, formatPercent, formatSignedMoney } from '@/lib/utils/formatMoney'
import { MaskedAmount } from './MaskedAmount'
import type { Currency, ExpenseKind } from '@/lib/supabase/database.types'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useExpensesForMonth } from '../hooks/useExpenses'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'
import { partialMonthCutoffDay, shiftMonth, type MonthKey } from '../utils/month'
import { buildMonthlyReport, UNCATEGORIZED, type CategoryBreakdown } from '../utils/report'

/** Dưới nửa phần trăm thì coi như đứng yên — "tăng 0%" đọc như một lỗi. */
const FLAT_THRESHOLD = 0.005

function ChangeLine({
  change,
  cutoffDay,
  t,
  locale,
  theme,
}: {
  change: number | null
  /** Không null = tháng đang diễn ra, hai bên chỉ so tới ngày này. */
  cutoffDay: number | null
  t: Dictionary
  locale: Locale
  theme: DerivedTheme
}) {
  // Nói rõ cửa sổ so sánh. Không có câu này thì "−40%" giữa tháng đọc như đã
  // tiêu ít hơn hẳn, trong khi thực ra chỉ là tháng chưa đi hết.
  const suffix =
    cutoffDay === null
      ? t.reportVsPrevMonth
      : t.reportVsPrevMonthPartial.replace('{d}', String(cutoffDay))

  if (change === null) {
    return (
      <span className="text-[11.5px] font-semibold" style={{ color: theme.mutedText }}>
        {t.reportNoPrevMonth}
      </span>
    )
  }

  // Nhánh này KHÔNG kèm `suffix`: `reportFlat` đã là "Ngang tháng trước", nối
  // thêm "so với tháng trước" nữa thì thành lặp.
  if (Math.abs(change) < FLAT_THRESHOLD) {
    return (
      <span className="text-[11.5px] font-semibold" style={{ color: theme.mutedText }}>
        {t.reportFlat}
      </span>
    )
  }

  const up = change > 0
  const Icon = up ? TrendingUpIcon : TrendingDownIcon
  // Tiêu nhiều hơn tô đỏ, ít hơn tô xanh — ngược quy ước của biểu đồ doanh thu,
  // vì ở đây "tăng" mới là tin xấu.
  const color = up ? theme.danger : theme.income

  return (
    <span className="flex flex-wrap items-center gap-1 text-[11.5px] font-bold" style={{ color }}>
      {/* Nói rõ con số này nói về tiền CHI: nó nằm ngay dưới số dư và tổng thu,
          thiếu nhãn thì rất dễ đọc thành "số dư tăng 12%". */}
      <span className="font-semibold" style={{ color: theme.mutedText }}>
        {t.expenseExpenseTotal}
      </span>
      <Icon className="size-3.5" />
      {up ? '+' : '−'}
      {formatPercent(Math.abs(change), locale)}
      <span className="font-semibold" style={{ color: theme.mutedText }}>
        {suffix}
      </span>
    </span>
  )
}

interface CategoryLineProps {
  row: CategoryBreakdown
  kind: ExpenseKind
  currency: Currency
  /** `undefined` khi danh mục đã bị xoá, hoặc khi đây là nhóm chưa phân loại. */
  category: ExpenseCategory | undefined
}

function CategoryLine({ row, kind, currency, category }: CategoryLineProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const name = category ? translateExpenseCategoryName(category.name, t) : t.expenseUncategorized
  const categoryId = row.categoryId === UNCATEGORIZED ? null : row.categoryId

  // Hạn mức chỉ đối chiếu trong đơn vị tiền mặc định và chỉ cho khoản CHI — xem
  // chú thích ở DEFAULT_CURRENCY: cột monthly_budget không mang currency, và
  // "vượt hạn mức thu nhập" thì không có nghĩa gì.
  const budget =
    kind === 'expense' && currency === DEFAULT_CURRENCY && category?.monthly_budget != null
      ? category.monthly_budget
      : null
  const overBudget = budget !== null && row.total > budget
  const budgetColor = overBudget ? theme.danger : theme.muted

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px]">
          {row.categoryId === UNCATEGORIZED ? '❔' : (category?.emoji ?? '❔')}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-bold"
          style={{ color: theme.text }}
        >
          {name}
        </span>
        <span
          className="flex-shrink-0 text-[11.5px] font-bold tabular-nums"
          style={{ color: theme.mutedText }}
        >
          {/* % cũng lộ độ lớn: che cùng lúc với số tiền của danh mục. */}
          <MaskedAmount categoryId={categoryId}>{formatPercent(row.share, locale)}</MaskedAmount>
        </span>
        <span
          className="flex-shrink-0 text-[13px] font-extrabold tabular-nums"
          style={{ color: kind === 'income' ? theme.income : theme.text }}
        >
          <MaskedAmount categoryId={categoryId}>
            {formatMoney(row.total, currency, locale)}
          </MaskedAmount>
        </span>
      </div>

      {/* Thanh tỉ lệ trên tổng cùng nhóm — độ dài đọc nhanh hơn con số %. Sàn 2%
          để danh mục rất nhỏ vẫn còn một vệt nhìn thấy được. */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: theme.inputBg }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(row.share * 100, 2)}%`,
            background: category?.color ?? (kind === 'income' ? theme.income : theme.muted),
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
              <MaskedAmount categoryId={categoryId}>
                {`${formatMoney(row.total, currency, locale)} / ${formatMoney(budget, currency, locale)}`}
              </MaskedAmount>
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
                width: `${Math.min(row.total / budget, 1) * 100}%`,
                background: overBudget ? theme.danger : theme.accent,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  const { theme } = useTheme()
  return (
    <div
      className="text-[11px] font-extrabold uppercase tracking-wider"
      style={{ color: theme.mutedText }}
    >
      {children}
    </div>
  )
}

/**
 * Báo cáo của tháng đang xem: mỗi đơn vị tiền một khối, gồm số dư, tổng thu,
 * tổng chi, mức so với tháng trước và tỉ lệ từng danh mục.
 *
 * Tháng lấy từ trang chứ không có bộ chọn riêng — hai bộ chọn tháng trên cùng
 * một màn hình thì sớm muộn cũng lệch nhau và người đọc không biết tin cái nào.
 */
export function MonthlyReport({ month }: { month: MonthKey }) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const expensesQuery = useExpensesForMonth(month)
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data])
  // Tháng trước là một query key khác nên có cache riêng: lùi một tháng rồi quay
  // lại không phải fetch thêm lần nào.
  const previousQuery = useExpensesForMonth(shiftMonth(month, -1))
  const previousExpenses = useMemo(() => previousQuery.data ?? [], [previousQuery.data])
  const { data: categories = [] } = useExpenseCategories()

  // Tháng đang diễn ra thì chỉ so với cùng số ngày của tháng trước.
  const cutoffDay = partialMonthCutoffDay(month)

  const reports = useMemo(
    () => buildMonthlyReport(expenses, previousExpenses, { previousCutoffDay: cutoffDay }),
    [expenses, previousExpenses, cutoffDay],
  )
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  )

  if (expensesQuery.isPending || (expensesQuery.isError && !expensesQuery.data)) {
    return <QueryStatus query={expensesQuery}>{null}</QueryStatus>
  }

  if (expenses.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm font-semibold" style={{ color: theme.mutedText }}>
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
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div>
                <SectionLabel>{t.expenseBalance}</SectionLabel>
                <div
                  className="font-heading text-[20px] font-extrabold tabular-nums"
                  style={{ color: report.balance < 0 ? theme.danger : theme.income }}
                >
                  <MaskedAmount scope="month">
                    {formatSignedMoney(report.balance, report.currency, locale, 'auto')}
                  </MaskedAmount>
                </div>
              </div>
              <span className="text-[11px] font-extrabold" style={{ color: theme.mutedText }}>
                {report.currency}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[12.5px] font-bold" style={{ color: theme.income }}>
                {t.expenseIncomeTotal}{' '}
                <span className="tabular-nums">
                  <MaskedAmount scope="month">
                    {formatSignedMoney(report.incomeTotal, report.currency, locale, 'income')}
                  </MaskedAmount>
                </span>
              </span>
              <span className="text-[12.5px] font-bold" style={{ color: theme.text }}>
                {t.expenseExpenseTotal}{' '}
                <span className="tabular-nums">
                  <MaskedAmount scope="month">
                    {formatSignedMoney(report.expenseTotal, report.currency, locale, 'expense')}
                  </MaskedAmount>
                </span>
              </span>
            </div>

            <ChangeLine
              change={report.change}
              cutoffDay={cutoffDay}
              t={t}
              locale={locale}
              theme={theme}
            />
            {report.incomeTotal > 0 && (
              <span className="text-[11.5px] font-semibold" style={{ color: theme.mutedText }}>
                {t.reportSpentOfIncome.split('{p}')[0]}
                <MaskedAmount scope="month">
                  {formatPercent(report.expenseTotal / report.incomeTotal, locale)}
                </MaskedAmount>
                {t.reportSpentOfIncome.split('{p}')[1] ?? ''}
              </span>
            )}

            {(report.plannedExpense > 0 || report.plannedIncome > 0) && (
              <div
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] font-semibold"
                style={{ color: theme.mutedText }}
              >
                <span>{t.expensePlannedNotCounted}</span>
                {report.plannedExpense > 0 && (
                  <span className="tabular-nums">
                    <MaskedAmount scope="month">
                      {formatSignedMoney(report.plannedExpense, report.currency, locale, 'expense')}
                    </MaskedAmount>
                  </span>
                )}
                {report.plannedIncome > 0 && (
                  <span className="tabular-nums">
                    <MaskedAmount scope="month">
                      {formatSignedMoney(report.plannedIncome, report.currency, locale, 'income')}
                    </MaskedAmount>
                  </span>
                )}
              </div>
            )}
          </div>

          {report.expenseCategories.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionLabel>{t.reportByExpenseCategory}</SectionLabel>
              <ExpenseDonut report={report} categoryById={categoryById} />
              {report.expenseCategories.map((row) => (
                <CategoryLine
                  key={row.categoryId}
                  row={row}
                  kind="expense"
                  currency={report.currency}
                  category={categoryById.get(row.categoryId)}
                />
              ))}
            </div>
          )}

          {report.incomeCategories.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionLabel>{t.reportByIncomeCategory}</SectionLabel>
              {report.incomeCategories.map((row) => (
                <CategoryLine
                  key={row.categoryId}
                  row={row}
                  kind="income"
                  currency={report.currency}
                  category={categoryById.get(row.categoryId)}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
