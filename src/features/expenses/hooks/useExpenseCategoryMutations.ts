import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  createExpenseCategory,
  deleteExpenseCategory,
  updateExpenseCategory,
  type ExpenseCategory,
  type ExpenseCategoryUpdate,
} from '../api/expenseCategoriesApi'
import { expenseCategoriesQueryKey } from './useExpenseCategories'
import { useInvalidateExpenses } from './useExpenseMutations'

interface CreateExpenseCategoryVars {
  name: string
  emoji: string
  color: string
  monthly_budget: number | null
}

export function useCreateExpenseCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = expenseCategoriesQueryKey(user?.id)

  return useMutation({
    mutationFn: (input: CreateExpenseCategoryVars) => {
      const existing = queryClient.getQueryData<ExpenseCategory[]>(key) ?? []
      // `sort_order` nối tiếp cuối danh sách, giống danh mục công việc — danh mục
      // mới thêm xuất hiện cuối, không chen vào giữa bộ seed.
      return createExpenseCategory({ ...input, user_id: user!.id, sort_order: existing.length })
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ExpenseCategory[]>(key, (prev) => [...(prev ?? []), created])
    },
  })
}

export function useUpdateExpenseCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = expenseCategoriesQueryKey(user?.id)

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ExpenseCategoryUpdate }) =>
      updateExpenseCategory(id, patch),
    onMutate: async ({ id, patch }) => {
      const previous = queryClient.getQueryData<ExpenseCategory[]>(key)
      queryClient.setQueryData<ExpenseCategory[]>(key, (prev) =>
        (prev ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}

export function useDeleteExpenseCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = expenseCategoriesQueryKey(user?.id)
  const invalidateExpenses = useInvalidateExpenses()

  return useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<ExpenseCategory[]>(key)
      queryClient.setQueryData<ExpenseCategory[]>(key, (prev) =>
        (prev ?? []).filter((c) => c.id !== id),
      )
      return { previous }
    },
    // `on delete set null` ở DB đổi luôn `category_id` của các khoản chi cũ, nên
    // cache tháng đang mở cũng phải làm mới — nếu không, danh sách vẫn vẽ nhãn
    // của một danh mục không còn tồn tại.
    onSuccess: () => invalidateExpenses(),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}
