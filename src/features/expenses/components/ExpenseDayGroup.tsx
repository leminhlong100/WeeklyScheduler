import { memo, useMemo } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { parseISODate, todayISO, weekdayMondayIndex } from '@/lib/utils/date'
import { formatSignedMoney } from '@/lib/utils/formatMoney'
import { MaskedAmount } from './MaskedAmount'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { summarizeByCurrency } from '../utils/totals'
import { ExpenseRow } from './ExpenseRow'

interface ExpenseDayGroupProps {
  date: string
  expenses: Expense[]
  categoryById: Map<string, ExpenseCategory>
  isToday: boolean
  /** Ghi đè tiêu đề ngày (nhóm "Sắp tới"). */
  title?: string
  /** Bỏ trống khi chỉ được xem. */
  onEdit?: (expense: Expense) => void
  onMarkPaid?: (expense: Expense) => void
}

/**
 * Một ngày trong danh sách: tiêu đề ngày + tổng của riêng ngày đó, rồi các dòng.
 *
 * Tổng ngày chỉ cộng `status = 'paid'`, giống mọi tổng khác trong app. Ngày nào
 * có kỳ chưa trả thì ghi thêm một cụm mờ — để con số ở tiêu đề không bao giờ
 * lệch so với các dòng bên dưới mà người đọc không hiểu tại sao.
 */
/** `memo`: gõ ô tìm đổi `filter` của danh sách nhưng nhóm ngày không đổi thì khỏi vẽ lại. */
export const ExpenseDayGroup = memo(function ExpenseDayGroup({
  date,
  expenses,
  categoryById,
  isToday,
  title,
  onEdit,
  onMarkPaid,
}: ExpenseDayGroupProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])
  const day = parseISODate(date)
  const isYesterday = day.add(1, 'day').format('YYYY-MM-DD') === todayISO()
  const label =
    title ??
    (isToday
      ? t.today
      : isYesterday
        ? t.dayYesterday
        : `${t.dow[weekdayMondayIndex(day)]}, ${day.format('DD/MM')}`)

  return (
    // `content-visibility: auto`: ngày nằm ngoài màn hình thì trình duyệt bỏ qua
    // layout/vẽ (Chrome 85+, Safari 18+; nơi khác bỏ qua vô hại). Kích thước ước
    // lượng `auto 300px` được thay bằng cỡ thật sau lần vẽ đầu.
    <section className="flex flex-col gap-2 [contain-intrinsic-size:auto_300px] [content-visibility:auto]">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-1">
        <span
          className="text-[13px] font-extrabold"
          style={{ color: isToday ? theme.accentText : theme.mutedText }}
        >
          {label}
        </span>

        <span className="flex flex-1 flex-wrap items-baseline justify-end gap-x-2.5 gap-y-0.5">
          {summaries.map((s) => (
            <span key={s.currency} className="flex items-baseline gap-2">
              {s.income > 0 && (
                <span
                  className="text-[12px] font-extrabold tabular-nums"
                  style={{ color: theme.income }}
                >
                  <MaskedAmount scope="day">
                    {formatSignedMoney(s.income, s.currency, locale, 'income')}
                  </MaskedAmount>
                </span>
              )}
              {s.expense > 0 && (
                <span
                  className="text-[12px] font-extrabold tabular-nums"
                  style={{ color: theme.text }}
                >
                  <MaskedAmount scope="day">
                    {formatSignedMoney(s.expense, s.currency, locale, 'expense')}
                  </MaskedAmount>
                </span>
              )}
              {s.plannedExpense > 0 && (
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{ color: theme.warning }}
                >
                  <MaskedAmount scope="day">
                    {t.plannedDayTotal.replace(
                      '{amount}',
                      formatSignedMoney(s.plannedExpense, s.currency, locale, 'expense'),
                    )}
                  </MaskedAmount>
                </span>
              )}
              {s.plannedIncome > 0 && (
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{ color: theme.warning }}
                >
                  <MaskedAmount scope="day">
                    {t.plannedDayTotal.replace(
                      '{amount}',
                      formatSignedMoney(s.plannedIncome, s.currency, locale, 'income'),
                    )}
                  </MaskedAmount>
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
            onEdit={onEdit}
            onMarkPaid={onMarkPaid}
          />
        ))}
      </div>
    </section>
  )
})
