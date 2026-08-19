import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useTheme } from '@/features/theme/ThemeContext'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { formatMoney } from '@/lib/utils/formatMoney'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'

interface ExpenseCategoryRowProps {
  category: ExpenseCategory
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseCategoryRow({ category, onEdit, onDelete }: ExpenseCategoryRowProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border-[1.5px] px-3 py-2.5"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      <span
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-base"
        style={{ background: `${category.color}33` }}
      >
        {category.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold" style={{ color: theme.text }}>
          {translateExpenseCategoryName(category.name, t)}
        </div>
        {/* Hạn mức luôn tính bằng đơn vị tiền mặc định — xem chú thích DEFAULT_CURRENCY. */}
        {category.monthly_budget != null && (
          <div className="truncate text-[11.5px] font-semibold" style={{ color: theme.muted }}>
            {t.reportBudget} {formatMoney(category.monthly_budget, DEFAULT_CURRENCY, locale)}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={t.editExpenseCategory}
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg"
        style={{ color: theme.muted }}
      >
        <PencilIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t.delete}
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg"
        style={{ color: theme.danger }}
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  )
}
