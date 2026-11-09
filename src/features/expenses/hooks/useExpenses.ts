import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { listExpensesInRange } from '../api/expensesApi'
import { ledgerCacheKey, useCurrentLedger } from '../LedgerContext'
import { monthRange, type MonthKey } from '../utils/month'

/**
 * Tháng nằm trong key: mỗi tháng là một entry cache riêng, nên chuyển tháng qua
 * lại không phải fetch lại, và bộ persist của TanStack Query giữ được chúng để
 * xem offline. Sổ cũng nằm trong key — đổi sổ không bao giờ hiện nhầm dữ liệu
 * của sổ kia từ cache.
 */
export const expensesQueryKey = (
  userId: string | undefined,
  ledgerId: string | null,
  month: MonthKey,
) => ['expenses', userId, ledgerCacheKey(ledgerId), month] as const

/**
 * Cả năm của tháng đang xem, để biết đã dư/thiếu và tiết kiệm được bao nhiêu khi
 * qua tháng. Key nằm dưới tiền tố `['expenses', userId]` nên mọi mutation đã
 * invalidate nó cùng các tháng.
 */
export function useExpensesForYear(year: number) {
  const { user } = useAuth()
  const { ledgerId, ownerId } = useCurrentLedger()

  return useQuery({
    queryKey: ['expenses', user?.id, ledgerCacheKey(ledgerId), 'year', year] as const,
    queryFn: () =>
      listExpensesInRange({ ownerId: ownerId!, ledgerId }, `${year}-01-01`, `${year + 1}-01-01`),
    enabled: !!user && !!ownerId,
  })
}

export function useExpensesForMonth(month: MonthKey) {
  const { user } = useAuth()
  const { ledgerId, ownerId } = useCurrentLedger()
  const { startISO, endExclusiveISO } = monthRange(month)

  return useQuery({
    queryKey: expensesQueryKey(user?.id, ledgerId, month),
    queryFn: () => listExpensesInRange({ ownerId: ownerId!, ledgerId }, startISO, endExclusiveISO),
    enabled: !!user && !!ownerId,
  })
}
