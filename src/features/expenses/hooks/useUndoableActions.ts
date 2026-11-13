import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { describeError } from '@/lib/utils/errorMessage'
import { deleteExpense } from '../api/expensesApi'
import type { Expense } from '../api/expensesApi'
import { useUpdateExpense } from './useExpenseMutations'

/** Thời gian có thể bấm "Hoàn tác". */
export const UNDO_MS = 5000

/**
 * Lệnh xoá đang chờ hết thời gian hoàn tác. Ở cấp module (không trong state)
 * để còn chạy được khi trang bị ẩn/đóng — xem `flushPendingDeletes`.
 */
const pendingDeletes = new Map<string, () => void>()

/**
 * Người dùng xoá rồi đóng app ngay (trong 5 giây) thì vẫn phải xoá thật: chạy
 * hết lệnh đang chờ khi trang bị ẩn. Không làm vậy thì khoản đã "xoá" sẽ hiện lại
 * ở lần mở sau — một lỗi rất khó hiểu với người dùng.
 */
function flushPendingDeletes() {
  for (const run of [...pendingDeletes.values()]) run()
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingDeletes()
  })
  window.addEventListener('pagehide', flushPendingDeletes)
}

/**
 * Xoá / đánh dấu đã trả / thêm mới — làm ngay, kèm toast có nút "Hoàn tác",
 * thay cho hộp `window.confirm` hỏi lại trước mỗi lần.
 *
 * Xoá theo kiểu "đợi rồi mới gọi": dòng biến mất khỏi danh sách ngay (sửa cache),
 * hết 5 giây mới gửi lệnh xoá. Hoàn tác thì chỉ cần huỷ hẹn giờ và tải lại — id
 * của dòng không đổi, các liên kết (chuỗi lặp, raw_text) còn nguyên.
 */
export function useUndoableActions() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  // Chỉ lấy `mutate` (ổn định giữa các lần render), không lấy cả object kết quả
  // (đổi mỗi lần render): `markPaidWithUndo` phải ổn định để dòng `memo` không vẽ lại.
  const { mutate: updateExpense } = useUpdateExpense()

  const refreshExpenses = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    [queryClient],
  )

  const removeFromCache = useCallback(
    (ids: ReadonlySet<string>) =>
      queryClient.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (old) =>
        Array.isArray(old) ? old.filter((e) => !ids.has(e.id)) : old,
      ),
    [queryClient],
  )

  const deleteWithUndo = useCallback(
    (expense: Expense) => {
      removeFromCache(new Set([expense.id]))
      const run = () => {
        clearTimeout(timer)
        pendingDeletes.delete(expense.id)
        deleteExpense(expense.id)
          .catch((error) => toast.error(describeError(t, error)))
          .finally(() => void refreshExpenses())
      }
      const timer = setTimeout(run, UNDO_MS)
      pendingDeletes.set(expense.id, run)
      toast.success(t.expenseDeleted, {
        duration: UNDO_MS,
        action: {
          label: t.undo,
          onClick: () => {
            clearTimeout(timer)
            pendingDeletes.delete(expense.id)
            void refreshExpenses()
          },
        },
      })
    },
    [removeFromCache, refreshExpenses, t],
  )

  const markPaidWithUndo = useCallback(
    (expense: Expense) => {
      updateExpense(
        { id: expense.id, patch: { status: 'paid' } },
        {
          onSuccess: () =>
            toast.success(
              expense.kind === 'income' ? t.incomeMarkedReceived : t.expenseMarkedPaid,
              {
                duration: UNDO_MS,
                action: {
                  label: t.undo,
                  onClick: () => updateExpense({ id: expense.id, patch: { status: 'planned' } }),
                },
              },
            ),
          onError: (error) => toast.error(describeError(t, error)),
        },
      )
    },
    [updateExpense, t],
  )

  /** Toast "đã thêm" có Hoàn tác = xoá đúng các dòng vừa tạo. */
  const announceCreated = useCallback(
    (message: string, created: Pick<Expense, 'id'>[]) => {
      toast.success(message, {
        duration: UNDO_MS,
        action: {
          label: t.undo,
          onClick: () => {
            const ids = new Set(created.map((e) => e.id))
            removeFromCache(ids)
            Promise.all([...ids].map((id) => deleteExpense(id)))
              .then(() => toast.success(t.restored))
              .catch((error) => toast.error(describeError(t, error)))
              .finally(() => void refreshExpenses())
          },
        },
      })
    },
    [removeFromCache, refreshExpenses, t],
  )

  return { deleteWithUndo, markPaidWithUndo, announceCreated }
}
