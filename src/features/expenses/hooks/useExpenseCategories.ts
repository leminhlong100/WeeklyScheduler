import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { listExpenseCategories } from '../api/expenseCategoriesApi'

export const expenseCategoriesQueryKey = (userId: string | undefined) =>
  ['expense-categories', userId] as const

export function useExpenseCategories() {
  const { user } = useAuth()

  return useQuery({
    queryKey: expenseCategoriesQueryKey(user?.id),
    queryFn: () => listExpenseCategories(user!.id),
    enabled: !!user,
  })
}
