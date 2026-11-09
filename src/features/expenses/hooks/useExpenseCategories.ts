import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { listExpenseCategories } from '../api/expenseCategoriesApi'
import { useCurrentLedger } from '../LedgerContext'

export const expenseCategoriesQueryKey = (userId: string | undefined) =>
  ['expense-categories', userId] as const

/**
 * Danh mục của CHỦ sổ đang mở. Với sổ của mình thì là danh mục của mình (key y
 * như trước, nên các mutation danh mục vẫn cập nhật đúng entry); với sổ được mời
 * xem thì là danh mục của người mời — RLS cho phép đọc qua `views_ledger_of`.
 */
export function useExpenseCategories() {
  const { user } = useAuth()
  const { ownerId } = useCurrentLedger()

  return useQuery({
    queryKey: expenseCategoriesQueryKey(ownerId),
    queryFn: () => listExpenseCategories(ownerId!),
    enabled: !!user && !!ownerId,
  })
}
