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

/**
 * Cả năm của tháng đang xem, để biết đã dư/thiếu và tiết kiệm được bao nhiêu khi
 * qua tháng. Key nằm dưới tiền tố `['expenses', userId]` nên mọi mutation đã
 * invalidate nó cùng các tháng.
 */
export function useExpensesForYear(year: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['expenses', user?.id, 'year', year] as const,
    queryFn: () => listExpensesInRange(user!.id, `${year}-01-01`, `${year + 1}-01-01`),
    enabled: !!user,
  })
}

export function useExpensesForMonth(month: MonthKey) {
  const { user } = useAuth()
  const { startISO, endExclusiveISO } = monthRange(month)

  return useQuery({
    queryKey: expensesQueryKey(user?.id, month),
    queryFn: () => listExpensesInRange(user!.id, startISO, endExclusiveISO),
    enabled: !!user,
  })
}
