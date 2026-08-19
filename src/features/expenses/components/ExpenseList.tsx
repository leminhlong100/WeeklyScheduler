import { useMemo } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatMoney } from '@/lib/utils/formatMoney'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { sumByCurrency } from '../utils/totals'
import { ExpenseRow } from './ExpenseRow'

interface ExpenseListProps {
  expenses: Expense[]
  categories: ExpenseCategory[]
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseList({ expenses, categories, onEdit, onDelete }: ExpenseListProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  )
  const totals = useMemo(() => sumByCurrency(expenses), [expenses])

  if (expenses.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm font-semibold" style={{ color: theme.muted }}>
        {t.noExpenses}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border-[1.5px] px-3.5 py-3"
        style={{ borderColor: theme.border, background: theme.chip }}
      >
        <span
          className="text-[11px] font-extrabold uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          {t.expenseMonthTotal}
        </span>
        {totals.map(({ currency, total }) => (
          <span
            key={currency}
            className="font-heading text-[17px] font-extrabold tabular-nums"
            style={{ color: theme.text }}
          >
            {formatMoney(total, currency, locale)}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            category={expense.category_id ? (categoryById.get(expense.category_id) ?? null) : null}
            onEdit={() => onEdit(expense)}
            onDelete={() => onDelete(expense)}
          />
        ))}
      </div>
    </div>
  )
}
