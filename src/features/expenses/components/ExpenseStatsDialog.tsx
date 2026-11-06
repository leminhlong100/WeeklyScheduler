import { useMemo } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatMoney } from '@/lib/utils/formatMoney'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useExpensesForMonth } from '../hooks/useExpenses'
import type { MonthKey } from '../utils/month'
import { buildMonthlyReport, UNCATEGORIZED, type CurrencyReport } from '../utils/report'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'
import { MaskedAmount } from './MaskedAmount'

const OVER_BUDGET_COLOR = '#d93a3a'

const SIZE = 160
const STROKE = 28
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Một chữ số thập phân: danh mục nhỏ vẫn đọc được là 0,4% chứ không phải 0%. */
function percent(ratio: number): string {
  return `${Math.round(ratio * 1000) / 10}%`
}

interface Slice {
  key: string
  name: string
  emoji: string
  color: string
  total: number
  /** Tỉ lệ trên tổng chi — quyết định độ rộng lát bánh. */
  share: number
  /** Tỉ lệ trên thu nhập; `null` khi tháng chưa có thu. */
  ofIncome: number | null
  /** Hạn mức tháng của danh mục, `null` nếu không có / không áp dụng. */
  budget: number | null
  overBudget: boolean
}

function Donut({
  slices,
  centerTop,
  centerBottom,
}: {
  slices: Slice[]
  centerTop: string
  centerBottom: string
}) {
  const { theme } = useTheme()
  // Điểm bắt đầu của mỗi lát = tổng độ dài các lát trước nó.
  const arcs = slices.map((s, i) => ({
    slice: s,
    length: s.share * CIRCUMFERENCE,
    offset: slices.slice(0, i).reduce((sum, p) => sum + p.share * CIRCUMFERENCE, 0),
  }))
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto size-[180px]" role="img">
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={theme.inputBg}
        strokeWidth={STROKE}
      />
      {arcs.map(({ slice, length, offset }) => (
        <circle
          key={slice.key}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={slice.color}
          strokeWidth={STROKE}
          strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
          strokeDashoffset={-offset}
          // Bắt đầu từ 12 giờ, chạy theo chiều kim đồng hồ.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      ))}
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        className="font-heading text-[20px] font-extrabold"
        fill={theme.text}
      >
        {centerTop}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="text-[9px] font-bold" fill={theme.muted}>
        {centerBottom}
      </text>
    </svg>
  )
}

function CurrencyStats({ report }: { report: CurrencyReport }) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()

  const slices = useMemo<Slice[]>(
    () =>
      report.expenseCategories.map((row) => {
        const category =
          row.categoryId === UNCATEGORIZED
            ? undefined
            : categories.find((c) => c.id === row.categoryId)
        // Cùng quy tắc với báo cáo tháng: hạn mức không mang đơn vị tiền nên chỉ đối
        // chiếu trong đơn vị mặc định.
        const budget =
          report.currency === DEFAULT_CURRENCY && category?.monthly_budget != null
            ? category.monthly_budget
            : null
        return {
          key: row.categoryId,
          name: category ? translateExpenseCategoryName(category.name, t) : t.expenseUncategorized,
          emoji: category?.emoji ?? '❔',
          color: category?.color ?? theme.muted,
          total: row.total,
          share: row.share,
          ofIncome: report.incomeTotal > 0 ? row.total / report.incomeTotal : null,
          budget,
          overBudget: budget !== null && row.total > budget,
        }
      }),
    [report, categories, t, theme.muted],
  )

  const spentOfIncome = report.incomeTotal > 0 ? report.expenseTotal / report.incomeTotal : null

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border-[1.5px] p-3.5"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      <Donut
        slices={slices}
        centerTop={spentOfIncome !== null ? percent(spentOfIncome) : report.currency}
        centerBottom={spentOfIncome !== null ? t.statsSpentOfIncome : t.expenseExpenseTotal}
      />

      <div className="text-center text-[11px] font-semibold" style={{ color: theme.muted }}>
        {spentOfIncome !== null ? t.statsBasisIncome : t.statsBasisExpense}
      </div>

      <div className="flex flex-col gap-2">
        {slices.map((s) => {
          const masked = {
            categoryId: s.key === UNCATEGORIZED ? null : s.key,
            scope: 'month' as const,
          }
          return (
            <div
              key={s.key}
              className="flex flex-col gap-0.5 rounded-xl px-2 py-1.5"
              // Vượt hạn mức: nền đỏ nhạt + viền trái đậm để lướt qua cũng thấy.
              style={
                s.overBudget
                  ? {
                      background: `${OVER_BUDGET_COLOR}1a`,
                      boxShadow: `inset 3px 0 0 ${OVER_BUDGET_COLOR}`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="size-3 flex-shrink-0 rounded-[4px]"
                  style={{ background: s.color }}
                  aria-hidden
                />
                <span>{s.emoji}</span>
                <span
                  className="min-w-0 flex-1 truncate font-bold"
                  style={{ color: s.overBudget ? OVER_BUDGET_COLOR : theme.text }}
                >
                  {s.name}
                </span>
                {s.overBudget && (
                  <TriangleAlertIcon
                    className="size-4 flex-shrink-0"
                    style={{ color: OVER_BUDGET_COLOR }}
                    aria-label={t.reportOverBudget}
                  />
                )}
                <span
                  className={`flex-shrink-0 tabular-nums ${s.overBudget ? 'font-black' : 'font-extrabold'}`}
                  style={{ color: s.overBudget ? OVER_BUDGET_COLOR : theme.text }}
                >
                  {percent(s.ofIncome ?? s.share)}
                </span>
                <span
                  className={`w-[92px] flex-shrink-0 text-right text-[12px] tabular-nums ${s.overBudget ? 'font-extrabold' : 'font-semibold'}`}
                  style={{ color: s.overBudget ? OVER_BUDGET_COLOR : theme.muted }}
                >
                  <MaskedAmount {...masked}>
                    {formatMoney(s.total, report.currency, locale)}
                  </MaskedAmount>
                </span>
              </div>
              {s.overBudget && s.budget !== null && (
                <div
                  className="pl-[22px] text-[11px] font-bold tabular-nums"
                  style={{ color: OVER_BUDGET_COLOR }}
                >
                  {t.reportOverBudget}:{' '}
                  <MaskedAmount {...masked}>
                    {`${formatMoney(s.total, report.currency, locale)} / ${formatMoney(s.budget, report.currency, locale)}`}
                  </MaskedAmount>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Biểu đồ tròn: tháng đang xem đã chi vào việc gì, mỗi danh mục chiếm bao nhiêu
 * % thu nhập (lương) — để thấy khoản nào ngốn nhiều nhất mà cắt bớt tháng sau.
 * Không có thu nhập trong tháng thì quay về tỉ lệ trên tổng chi.
 */
export function ExpenseStatsDialog({
  open,
  onOpenChange,
  month,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: MonthKey
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: expenses = [] } = useExpensesForMonth(month)

  const reports = useMemo(
    () => buildMonthlyReport(expenses, []).filter((r) => r.expenseTotal > 0),
    [expenses],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {t.expenseStats}
        </DialogTitle>

        {reports.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold" style={{ color: theme.muted }}>
            {t.reportNoData}
          </p>
        ) : (
          reports.map((r) => <CurrencyStats key={r.currency} report={r} />)
        )}
      </DialogContent>
    </Dialog>
  )
}
