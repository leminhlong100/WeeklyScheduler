import { PencilIcon, RepeatIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { formatMoney } from '@/lib/utils/formatMoney'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'

interface ExpenseRowProps {
  expense: Expense
  /** Null khi danh mục đã bị xoá — hàng vẫn hiện, chỉ mất nhãn. */
  category: ExpenseCategory | null
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseRow({ expense, category, onEdit, onDelete }: ExpenseRowProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2.5"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      <span
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-base"
        style={{ background: category ? `${category.color}33` : theme.inputBg }}
      >
        {category?.emoji ?? '❔'}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-bold" style={{ color: theme.text }}>
            {expense.note || t.expenseUncategorized}
          </span>
          {expense.series_id && (
            <RepeatIcon
              className="size-3.5 flex-shrink-0"
              style={{ color: theme.muted }}
              aria-label={t.expenseRepeat}
            />
          )}
          {expense.source === 'ai' && (
            <span
              className="flex-shrink-0 rounded-md px-1.5 py-px text-[10px] font-extrabold"
              style={{ background: theme.inputBg, color: theme.muted }}
            >
              {t.expenseSourceAi}
            </span>
          )}
        </div>
        <div className="truncate text-[11.5px] font-semibold" style={{ color: theme.muted }}>
          {category ? translateExpenseCategoryName(category.name, t) : t.expenseUncategorized}
          {' · '}
          {expense.spent_at}
        </div>
      </div>

      <span
        className="flex-shrink-0 text-[14px] font-extrabold tabular-nums"
        style={{ color: theme.text }}
      >
        {formatMoney(expense.amount, expense.currency, locale)}
      </span>

      <div className="flex flex-shrink-0 gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={t.editExpense}
          className="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-150 active:scale-95"
          style={{ color: theme.muted }}
        >
          <PencilIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t.delete}
          className="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-150 active:scale-95"
          style={{ color: theme.muted }}
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>
    </div>
  )
}
