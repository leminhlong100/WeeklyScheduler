import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatPercent } from '@/lib/utils/formatMoney'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { useAmountVisibility } from '../AmountVisibilityContext'
import { UNCATEGORIZED, type CurrencyReport } from '../utils/report'

const SIZE = 160
const STROKE = 28
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Biểu đồ tròn chi tiêu theo danh mục, đặt ở đầu mỗi khối tiền tệ của tab Báo
 * cáo. Trước đây nó nằm trong hộp "Thống kê" riêng và tính % trên THU NHẬP, còn
 * tab Báo cáo tính trên TỔNG CHI — hai màn hình, hai con số. Giờ chỉ còn một chỗ
 * và một gốc: % trên tổng chi (cộng lại = 100%, khớp độ rộng các lát).
 */
export function ExpenseDonut({
  report,
  categoryById,
}: {
  report: CurrencyReport
  categoryById: ReadonlyMap<string, ExpenseCategory>
}) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { isMasked } = useAmountVisibility()
  if (report.expenseCategories.length === 0) return null

  const rows = report.expenseCategories
  const arcs = rows.map((row, i) => {
    const category = row.categoryId === UNCATEGORIZED ? undefined : categoryById.get(row.categoryId)
    return {
      key: row.categoryId,
      color: category?.color ?? theme.mutedText,
      length: row.share * CIRCUMFERENCE,
      // Điểm bắt đầu = tổng độ dài các lát trước nó.
      offset: rows.slice(0, i).reduce((sum, r) => sum + r.share * CIRCUMFERENCE, 0),
      name: category ? translateExpenseCategoryName(category.name, t) : t.expenseUncategorized,
    }
  })

  const spentOfIncome = report.incomeTotal > 0 ? report.expenseTotal / report.incomeTotal : null
  const center =
    spentOfIncome === null || isMasked('month')
      ? report.currency
      : formatPercent(spentOfIncome, locale)
  const label = arcs
    .map((a, i) => `${a.name} ${formatPercent(report.expenseCategories[i].share, locale)}`)
    .join(', ')

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto size-[168px]"
      role="img"
      aria-label={`${t.expenseStats}: ${label}`}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={theme.inputBg}
        strokeWidth={STROKE}
      />
      {arcs.map((a) => (
        <circle
          key={a.key}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={a.color}
          strokeWidth={STROKE}
          strokeDasharray={`${a.length} ${CIRCUMFERENCE - a.length}`}
          strokeDashoffset={-a.offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      ))}
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        className="font-heading text-[20px] font-extrabold"
        fill={theme.text}
      >
        {center}
      </text>
      {spentOfIncome !== null && (
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="text-[9px] font-bold"
          fill={theme.mutedText}
        >
          {t.statsSpentOfIncome}
        </text>
      )}
    </svg>
  )
}
