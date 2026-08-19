import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { listExpensesInRange } from '../api/expensesApi'
import { monthRange, type MonthKey } from '../utils/month'

/**
 * Tháng nằm trong key: mỗi tháng là một entry cache riêng, nên chuyển tháng qua
 * lại không phải fetch lại, và bộ persist của TanStack Query giữ được chúng để
 * xem offline.
 */
export const expensesQueryKey = (userId: string | undefined, month: MonthKey) =>
  ['expenses', userId, month] as const

export function useExpensesForMonth(month: MonthKey) {
  const { user } = useAuth()
  const { startISO, endExclusiveISO } = monthRange(month)

  return useQuery({
    queryKey: expensesQueryKey(user?.id, month),
    queryFn: () => listExpensesInRange(user!.id, startISO, endExclusiveISO),
    enabled: !!user,
  })
}
