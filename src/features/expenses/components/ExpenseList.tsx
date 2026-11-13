import { useMemo } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { todayISO } from '@/lib/utils/date'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import {
  EMPTY_EXPENSE_FILTER,
  groupByDay,
  isFilterActive,
  type ExpenseFilter,
} from '../utils/filter'
import { summarizeByCurrency } from '../utils/totals'
import { ExpenseDayGroup } from './ExpenseDayGroup'
import { ExpenseFilters } from './ExpenseFilters'
import { useAmountVisibility } from '../AmountVisibilityContext'
import { formatSignedMoney } from '@/lib/utils/formatMoney'

interface ExpenseListProps {
  /** Đã lọc — tổng ở đầu danh sách cố ý tính trên đúng tập đang hiện. */
  expenses: Expense[]
  /** Số dòng của cả tháng, để phân biệt "tháng trống" với "lọc không ra gì". */
  monthCount: number
  categories: ExpenseCategory[]
  filter: ExpenseFilter
  onFilterChange: (next: ExpenseFilter) => void
  /** Bỏ trống khi chỉ được xem (sổ người khác chia sẻ). */
  onEdit?: (expense: Expense) => void
  onMarkPaid?: (expense: Expense) => void
}

export function ExpenseList({
  expenses,
  monthCount,
  categories,
  filter,
  onFilterChange,
  onEdit,
  onMarkPaid,
}: ExpenseListProps) {
  const { t, locale } = useTranslation()
  const { isMasked } = useAmountVisibility()
  const { theme } = useTheme()

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  )
  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])
  const today = todayISO()
  // Khoản dự kiến ở TƯƠNG LAI (tiền nhà ngày 30…) gom xuống nhóm "Sắp tới" ở
  // cuối. Để chung thì chúng nằm trên cả hôm nay vì danh sách sắp mới nhất trước.
  const { days, upcomingDays } = useMemo(() => {
    const isFuture = (e: Expense) => e.status === 'planned' && e.spent_at > today
    return {
      days: groupByDay(expenses.filter((e) => !isFuture(e))),
      upcomingDays: groupByDay(expenses.filter(isFuture).reverse()),
    }
  }, [expenses, today])

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
        <>
          <p
            className="px-1 py-8 text-center text-sm font-semibold"
            style={{ color: theme.mutedText }}
          >
            {isFilterActive(filter) && monthCount > 0 ? t.filterNoResults : t.noExpenses}
          </p>
        </>
      ) : (
        <>
          {/* Tổng tháng nằm ở Tổng quan. Ở đây chỉ hiện tổng khi ĐANG LỌC, và ghi
              rõ là tổng của kết quả lọc — trước đây thẻ "Tổng tháng" tính trên tập
              đã lọc nên dễ bị đọc nhầm thành số dư cả tháng. */}
          {isFilterActive(filter) && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold"
              style={{ background: theme.chip, color: theme.text }}
            >
              <span>
                {t.filterResultSummary
                  .replace('{n}', String(expenses.length))
                  .replace(
                    '{amount}',
                    summaries
                      .map((s) =>
                        isMasked('month')
                          ? '••••••'
                          : formatSignedMoney(s.balance, s.currency, locale, 'auto'),
                      )
                      .join(' · ') || '0',
                  )}
              </span>
              <button
                type="button"
                onClick={() => onFilterChange(EMPTY_EXPENSE_FILTER)}
                className="min-h-9 rounded-[10px] px-3 text-[12.5px] font-extrabold"
                style={{ background: theme.inputBg, color: theme.accent }}
              >
                {t.filterClear}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            {days.map((group) => (
              <ExpenseDayGroup
                key={group.date}
                date={group.date}
                expenses={group.expenses}
                categoryById={categoryById}
                isToday={group.date === today}
                onEdit={onEdit}
                onMarkPaid={onMarkPaid}
              />
            ))}
            {upcomingDays.length > 0 && (
              <details
                className="rounded-2xl border-[1.5px] border-dashed p-3"
                style={{ borderColor: theme.border }}
              >
                <summary
                  className="flex min-h-9 cursor-pointer items-center text-[13px] font-extrabold"
                  style={{ color: theme.warning }}
                >
                  {`${t.upcomingTitle} (${upcomingDays.reduce((n, g) => n + g.expenses.length, 0)})`}
                </summary>
                <div className="mt-2 flex flex-col gap-3.5">
                  {upcomingDays.map((group) => (
                    <ExpenseDayGroup
                      key={group.date}
                      date={group.date}
                      expenses={group.expenses}
                      categoryById={categoryById}
                      isToday={false}
                      onEdit={onEdit}
                      onMarkPaid={onMarkPaid}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  )
}
