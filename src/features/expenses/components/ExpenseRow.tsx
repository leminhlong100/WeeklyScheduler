import { memo } from 'react'
import { CheckIcon, RepeatIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { formatSignedMoney } from '@/lib/utils/formatMoney'
import { MaskedAmount } from './MaskedAmount'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { todayISO } from '@/lib/utils/date'
import { isOverdue } from '../utils/overview'

/** Tiền vào tô xanh, dùng lại đúng màu "dưới hạn mức" của báo cáo. */

interface ExpenseRowProps {
  expense: Expense
  /** Null khi danh mục đã bị xoá — hàng vẫn hiện, chỉ mất nhãn. */
  category: ExpenseCategory | null
  /** Bỏ trống khi chỉ được xem (sổ người khác chia sẻ): hàng không bấm được. */
  onEdit?: (expense: Expense) => void
  /** Chỉ gọi được với dòng `status = 'planned'`: xác nhận đã trả/đã nhận thật. */
  onMarkPaid?: (expense: Expense) => void
}

/**
 * `memo`: tháng có vài trăm dòng, mỗi phím gõ ở ô tìm trước đây vẽ lại mọi dòng.
 * Cha truyền callback ổn định nhận `expense` (không tạo closure mới cho từng
 * dòng), nên dòng không đổi thì không vẽ lại.
 */
export const ExpenseRow = memo(function ExpenseRow({
  expense,
  category,
  onEdit,
  onMarkPaid,
}: ExpenseRowProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const isIncome = expense.kind === 'income'
  const isPlanned = expense.status === 'planned'
  // Dự kiến mà đã qua ngày: chưa chắc đã trả — nhắc người dùng xác nhận.
  const overdue = isOverdue(expense, todayISO())
  const categoryName = category
    ? translateExpenseCategoryName(category.name, t)
    : t.expenseUncategorized
  // Ghi chú trống thì tên danh mục làm tiêu đề — thay cho "(không ghi chú)" mờ
  // nhạt lặp lại trên nhiều dòng.
  const title = expense.note || categoryName

  return (
    <div
      className="relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5"
      style={{
        // Viền gạch nối cho khoản chưa trả: khác hẳn dòng đã trả ngay từ đường nét.
        border: `1.5px ${isPlanned ? 'dashed' : 'solid'} ${theme.border}`,
        background: theme.chip,
      }}
    >
      {/* Cả hàng là vùng bấm để sửa (nút phủ toàn bộ), thay cho 3 nút icon 32px
          chen nhau bên phải. Xoá nằm trong form sửa. */}
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(expense)}
          aria-label={`${isIncome ? t.editIncome : t.editExpense}: ${title}`}
          className="absolute inset-0 rounded-2xl transition-colors active:bg-black/5"
        />
      )}

      <span
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-lg"
        style={{ background: category ? `${category.color}33` : theme.inputBg }}
        aria-hidden
      >
        {category?.emoji ?? '❔'}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold" style={{ color: theme.text }}>
            {title}
          </span>
          {expense.series_id && (
            <RepeatIcon
              className="size-3.5 flex-shrink-0"
              style={{ color: theme.mutedText }}
              aria-label={t.expenseRepeat}
            />
          )}
          {expense.source === 'ai' && (
            <span
              className="flex-shrink-0 rounded-md px-1.5 py-px text-[10px] font-extrabold"
              style={{ background: theme.inputBg, color: theme.mutedText }}
            >
              {t.expenseSourceAi}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expense.note && (
            <span className="truncate text-[12px] font-semibold" style={{ color: theme.mutedText }}>
              {categoryName}
            </span>
          )}
          {isPlanned && (
            <span
              className="flex-shrink-0 rounded-md px-1.5 py-px text-[11px] font-extrabold"
              style={{
                background: overdue ? `${theme.danger}1f` : theme.warningBg,
                color: overdue ? theme.danger : theme.warning,
              }}
            >
              {overdue ? t.overdueBadge : t.expensePlannedBadge}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span
          className="text-[14.5px] font-extrabold tabular-nums"
          style={{ color: isIncome ? theme.income : theme.text }}
        >
          <MaskedAmount categoryId={expense.category_id}>
            {formatSignedMoney(expense.amount, expense.currency, locale, expense.kind)}
          </MaskedAmount>
        </span>
        {/* "Đã trả" là việc chính của một khoản dự kiến nên nằm ngay trên hàng,
            dưới số tiền — số tiền của mọi hàng vẫn thẳng một cột. */}
        {isPlanned && onMarkPaid && (
          <button
            type="button"
            onClick={() => onMarkPaid(expense)}
            className="relative z-[1] flex min-h-11 items-center gap-1 rounded-full px-3 sm:min-h-9 text-[12px] font-extrabold transition-transform active:scale-95"
            style={{ background: `${theme.income}1f`, color: theme.income }}
          >
            <CheckIcon className="size-3.5" />
            {isIncome ? t.incomeMarkReceived : t.expenseMarkPaid}
          </button>
        )}
      </div>
    </div>
  )
})
