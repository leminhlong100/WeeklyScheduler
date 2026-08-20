import { useMemo } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { todayISO } from '@/lib/utils/date'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { groupByDay, isFilterActive, type ExpenseFilter } from '../utils/filter'
import { summarizeByCurrency } from '../utils/totals'
import { ExpenseDayGroup } from './ExpenseDayGroup'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseSummaryCard } from './ExpenseSummaryCard'

interface ExpenseListProps {
  /** Đã lọc — tổng ở đầu danh sách cố ý tính trên đúng tập đang hiện. */
  expenses: Expense[]
  /** Số dòng của cả tháng, để phân biệt "tháng trống" với "lọc không ra gì". */
  monthCount: number
  categories: ExpenseCategory[]
  filter: ExpenseFilter
  onFilterChange: (next: ExpenseFilter) => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onMarkPaid: (expense: Expense) => void
}

export function ExpenseList({
  expenses,
  monthCount,
  categories,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onMarkPaid,
}: ExpenseListProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  )
  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])
  const days = useMemo(() => groupByDay(expenses), [expenses])
  const today = todayISO()

  // Tháng trống thì bộ lọc chỉ là ba ô vô dụng chiếm chỗ; có dữ liệu mà lọc
  // không ra gì thì vẫn phải hiện để người dùng sửa/xoá điều kiện.
  const showFilters = monthCount > 0

  return (
    <div className="flex flex-col gap-3">
      {showFilters && (
        <ExpenseFilters
          value={filter}
          onChange={onFilterChange}
          categories={categories}
          resultCount={expenses.length}
        />
      )}

      {expenses.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm font-semibold" style={{ color: theme.muted }}>
          {isFilterActive(filter) && monthCount > 0 ? t.filterNoResults : t.noExpenses}
        </p>
      ) : (
        <>
          <ExpenseSummaryCard summaries={summaries} />

          <div className="flex flex-col gap-3.5">
            {days.map((group) => (
              <ExpenseDayGroup
                key={group.date}
                date={group.date}
                expenses={group.expenses}
                categoryById={categoryById}
                isToday={group.date === today}
                onEdit={onEdit}
                onDelete={onDelete}
                onMarkPaid={onMarkPaid}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
