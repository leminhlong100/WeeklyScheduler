import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { useCurrentLedger } from '../LedgerContext'
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

// Mặc định ('online') TanStack Query TẠM DỪNG mutation khi mất mạng: nút Lưu
// khoá mãi, không báo gì, và có mạng lại thì lệnh cũ chạy tiếp (dễ thành 2
// dòng). 'always' gọi ngay → lỗi mạng trả về liền, form còn nguyên để thử lại.
const WRITE_NETWORK_MODE = 'always' as const

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

/**
 * Khoản mới luôn vào sổ đang mở. Chỉ chủ sổ ghi được — với sổ được mời xem, UI
 * không có nút thêm, và RLS cũng từ chối nếu có ai cố gọi.
 */
export function useCreateExpense() {
  const { user } = useAuth()
  const { ledgerId } = useCurrentLedger()
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: (input: Omit<ExpenseInsert, 'user_id' | 'ledger_id'>) =>
      createExpense({ ...input, user_id: user!.id, ledger_id: ledgerId }),
    networkMode: WRITE_NETWORK_MODE,
    onSuccess: invalidate,
  })
}

/** Lưu cả bảng nháp AI một lần — dùng ở Bước 4 (QuickAddSheet). */
export function useBulkCreateExpenses() {
  const { user } = useAuth()
  const { ledgerId } = useCurrentLedger()
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: (inputs: Omit<ExpenseInsert, 'user_id' | 'ledger_id'>[]) =>
      bulkCreateExpenses(
        inputs.map((input) => ({ ...input, user_id: user!.id, ledger_id: ledgerId })),
      ),
    networkMode: WRITE_NETWORK_MODE,
    onSuccess: invalidate,
  })
}

export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ExpenseUpdate }) => updateExpense(id, patch),
    networkMode: WRITE_NETWORK_MODE,
    onSuccess: invalidate,
  })
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses()

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    networkMode: WRITE_NETWORK_MODE,
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
    networkMode: WRITE_NETWORK_MODE,
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
    networkMode: WRITE_NETWORK_MODE,
    onSuccess: invalidate,
  })
}
