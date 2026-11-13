import { CheckIcon, PencilIcon, RepeatIcon, Trash2Icon } from 'lucide-react'
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
  /** Bỏ trống cả ba khi chỉ được xem (sổ người khác chia sẻ): ẩn hết nút thao tác. */
  onEdit?: () => void
  onDelete?: () => void
  /** Chỉ gọi được với dòng `status = 'planned'`: xác nhận đã trả/đã nhận thật. */
  onMarkPaid?: () => void
}

export function ExpenseRow({ expense, category, onEdit, onDelete, onMarkPaid }: ExpenseRowProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  const isIncome = expense.kind === 'income'
  const isPlanned = expense.status === 'planned'
  // Dự kiến mà đã qua ngày: chưa chắc đã trả — nhắc người dùng xác nhận.
  const overdue = isOverdue(expense, todayISO())

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5"
      style={{
        // Viền gạch nối cho kỳ chưa trả: khác hẳn dòng đã trả ngay từ đường nét,
        // không phải đọc chữ mới biết.
        border: `1.5px ${isPlanned ? 'dashed' : 'solid'} ${theme.border}`,
        background: theme.chip,
      }}
    >
      <span
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-base"
        style={{ background: category ? `${category.color}33` : theme.inputBg }}
      >
        {category?.emoji ?? '❔'}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="truncate text-[13.5px] font-bold"
            // Ghi chú rỗng không phải "chưa phân loại" — đó là hai chuyện khác
            // nhau. Chỗ trống được nói rõ là chỗ trống, và tô mờ để không tranh
            // sự chú ý với các dòng có nội dung thật.
            style={{ color: expense.note ? theme.text : theme.muted }}
          >
            {expense.note || t.expenseNoNote}
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
        <div className="truncate text-[11.5px] font-semibold" style={{ color: theme.mutedText }}>
          {category ? translateExpenseCategoryName(category.name, t) : t.expenseUncategorized}
        </div>
      </div>

      <span
        className="flex-shrink-0 text-[14px] font-extrabold tabular-nums"
        style={{ color: isIncome ? theme.income : theme.text }}
      >
        <MaskedAmount categoryId={expense.category_id}>
          {formatSignedMoney(expense.amount, expense.currency, locale, expense.kind)}
        </MaskedAmount>
      </span>

      {(onEdit || onDelete || onMarkPaid) && (
        <div className="flex flex-shrink-0 gap-1">
          {/* Chuyển 'planned' -> 'paid' là hành động chính của một kỳ chưa trả, nên
            nó đứng ngay đây thay vì bắt mở form sửa rồi tìm một ô chọn. */}
          {isPlanned && onMarkPaid && (
            <button
              type="button"
              onClick={onMarkPaid}
              aria-label={isIncome ? t.incomeMarkReceived : t.expenseMarkPaid}
              title={isIncome ? t.incomeMarkReceived : t.expenseMarkPaid}
              className="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-150 active:scale-95"
              style={{ color: theme.income }}
            >
              <CheckIcon className="size-4" />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={isIncome ? t.editIncome : t.editExpense}
              className="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-150 active:scale-95"
              style={{ color: theme.mutedText }}
            >
              <PencilIcon className="size-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={t.delete}
              className="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-150 active:scale-95"
              style={{ color: theme.mutedText }}
            >
              <Trash2Icon className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
