import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  cancelLedgerDeposit,
  countPendingDeposits,
  createLedgerDeposit,
  decideLedgerDeposit,
  listLedgerDeposits,
  type NewLedgerDeposit,
} from '../api/ledgerDepositsApi'

/** Tiền tố chung: mọi thay đổi một yêu cầu nạp làm mới cả danh sách lẫn số đếm. */
const depositsRootKey = (userId: string | undefined) => ['ledger-deposits', userId] as const

/** `ledgerId = null` = mọi sổ (ở sổ cá nhân của người nạp). */
export function useLedgerDeposits(ledgerId: string | null, enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...depositsRootKey(user?.id), ledgerId ?? 'all'] as const,
    queryFn: () => listLedgerDeposits(ledgerId),
    enabled: !!user && enabled,
  })
}

/** Số yêu cầu đang chờ ở từng sổ mình sở hữu — chấm báo trên danh sách sổ. */
export function usePendingDepositCounts(enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...depositsRootKey(user?.id), 'pending-counts'] as const,
    queryFn: countPendingDeposits,
    enabled: !!user && enabled,
    // Người nạp ở máy khác; mở lại tab là thấy yêu cầu mới.
    refetchOnWindowFocus: true,
  })
}

function useInvalidateDeposits() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: depositsRootKey(user?.id) })
}

export function useCreateLedgerDeposit() {
  const invalidate = useInvalidateDeposits()
  return useMutation({
    mutationFn: (input: NewLedgerDeposit) => createLedgerDeposit(input),
    onSuccess: invalidate,
  })
}

export function useCancelLedgerDeposit() {
  const invalidate = useInvalidateDeposits()
  return useMutation({
    mutationFn: (id: string) => cancelLedgerDeposit(id),
    onSuccess: invalidate,
  })
}

export function useDecideLedgerDeposit() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDeposits()
  return useMutation({
    mutationFn: ({
      id,
      approve,
      incomeNote,
    }: {
      id: string
      approve: boolean
      incomeNote: string
    }) => decideLedgerDeposit(id, approve, incomeNote),
    onSuccess: async (_data, { approve }) => {
      // Duyệt thêm một khoản thu vào sổ: làm mới danh sách và số dư (cùng tiền tố).
      if (approve) await queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] })
      await invalidate()
    },
  })
}
