import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  bulkCreateExpenses,
  createExpense,
  deleteExpense,
  deleteExpenseSeriesFrom,
  updateExpense,
  updateExpenseSeriesFrom,
  type ExpenseInsert,
  type ExpenseUpdate,
} from '../api/expensesApi'

/**
 * Cache được chia theo tháng (xem `expensesQueryKey`), mà sửa `spent_at` thì
 * khoản chi nhảy sang tháng khác — cập nhật tại chỗ sẽ để lại bản sao ở tháng cũ.
 * Nên mọi mutation đều invalidate cả tiền tố `['expenses', userId]`; danh sách
 * một tháng chỉ vài trăm dòng, refetch rẻ hơn nhiều so với việc gỡ rối cache.
 *
 * Export ra ngoài vì xoá một DANH MỤC cũng đổi dữ liệu chi tiêu: DB set
 * `category_id` về NULL, nên cache tháng đang mở cũng phải làm mới.
 */
export function useInvalidateExpenses() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] })
}

export function useCreateExpense() {
  const { user } = useAuth()
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: (input: Omit<ExpenseInsert, 'user_id'>) =>
      createExpense({ ...input, user_id: user!.id }),
    onSuccess: invalidate,
  })
}

/** Lưu cả bảng nháp AI một lần — dùng ở Bước 4 (QuickAddSheet). */
export function useBulkCreateExpenses() {
  const { user } = useAuth()
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: (inputs: Omit<ExpenseInsert, 'user_id'>[]) =>
      bulkCreateExpenses(inputs.map((input) => ({ ...input, user_id: user!.id }))),
    onSuccess: invalidate,
  })
}

export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ExpenseUpdate }) => updateExpense(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: invalidate,
  })
}

/**
 * Sửa mọi kỳ của một chuỗi định kỳ, tính từ kỳ đang mở trở đi. Chuỗi trải qua
 * nhiều tháng nên đụng vào nhiều bucket cache — cứ invalidate cả tiền tố.
 */
export function useUpdateExpenseSeries() {
  const { user } = useAuth()
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: ({
      seriesId,
      fromISO,
      patch,
    }: {
      seriesId: string
      fromISO: string
      patch: Omit<ExpenseUpdate, 'spent_at' | 'series_id'>
    }) => updateExpenseSeriesFrom(user!.id, seriesId, fromISO, patch),
    onSuccess: invalidate,
  })
}

/** Xoá mọi kỳ của một chuỗi định kỳ, tính từ kỳ đang mở trở đi. */
export function useDeleteExpenseSeries() {
  const { user } = useAuth()
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: ({ seriesId, fromISO }: { seriesId: string; fromISO: string }) =>
      deleteExpenseSeriesFrom(user!.id, seriesId, fromISO),
    onSuccess: invalidate,
  })
}
