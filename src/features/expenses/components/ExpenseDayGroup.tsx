import { useMemo } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { parseISODate, weekdayMondayIndex } from '@/lib/utils/date'
import { formatMoney } from '@/lib/utils/formatMoney'
import { MaskedAmount } from './MaskedAmount'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { summarizeByCurrency } from '../utils/totals'
import { ExpenseRow } from './ExpenseRow'

const INCOME_COLOR = '#2fc39a'

interface ExpenseDayGroupProps {
  date: string
  expenses: Expense[]
  categoryById: Map<string, ExpenseCategory>
  isToday: boolean
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onMarkPaid: (expense: Expense) => void
}

/**
 * Một ngày trong danh sách: tiêu đề ngày + tổng của riêng ngày đó, rồi các dòng.
 *
 * Tổng ngày chỉ cộng `status = 'paid'`, giống mọi tổng khác trong app. Ngày nào
 * có kỳ chưa trả thì ghi thêm một cụm mờ — để con số ở tiêu đề không bao giờ
 * lệch so với các dòng bên dưới mà người đọc không hiểu tại sao.
 */
export function ExpenseDayGroup({
  date,
  expenses,
  categoryById,
  isToday,
  onEdit,
  onDelete,
  onMarkPaid,
}: ExpenseDayGroupProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])
  const day = parseISODate(date)
  const label = `${t.dow[weekdayMondayIndex(day)]} ${day.format('DD/MM')}`

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-1">
        <span
          className="text-[12px] font-extrabold"
          style={{ color: isToday ? theme.accent : theme.muted }}
        >
          {label}
          {isToday && ` · ${t.today}`}
        </span>

        <span className="flex flex-1 flex-wrap items-baseline justify-end gap-x-2.5 gap-y-0.5">
          {summaries.map((s) => (
            <span key={s.currency} className="flex items-baseline gap-2">
              {s.income > 0 && (
                <span
                  className="text-[12px] font-extrabold tabular-nums"
                  style={{ color: INCOME_COLOR }}
                >
                  <MaskedAmount>{`+${formatMoney(s.income, s.currency, locale)}`}</MaskedAmount>
                </span>
              )}
              {s.expense > 0 && (
                <span
                  className="text-[12px] font-extrabold tabular-nums"
                  style={{ color: theme.text }}
                >
                  <MaskedAmount>{`−${formatMoney(s.expense, s.currency, locale)}`}</MaskedAmount>
                </span>
              )}
              {(s.plannedExpense > 0 || s.plannedIncome > 0) && (
                <span className="text-[11px] font-semibold" style={{ color: theme.muted }}>
                  {t.expensePlannedShort}
                </span>
              )}
            </span>
          ))}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            category={expense.category_id ? (categoryById.get(expense.category_id) ?? null) : null}
            onEdit={() => onEdit(expense)}
            onDelete={() => onDelete(expense)}
            onMarkPaid={() => onMarkPaid(expense)}
          />
        ))}
      </div>
    </section>
  )
}
