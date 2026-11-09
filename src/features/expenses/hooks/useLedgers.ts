import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  createLedger,
  deleteLedger,
  getLedgerBalance,
  joinLedger,
  listLedgerMembers,
  listMyLedgers,
  removeLedgerMember,
  setLedgerInvite,
  updateLedger,
} from '../api/ledgersApi'

export const ledgersQueryKey = (userId: string | undefined) => ['ledgers', userId] as const

export function useLedgers() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ledgersQueryKey(user?.id),
    queryFn: listMyLedgers,
    enabled: !!user,
  })
}

export function useLedgerMembers(ledgerId: string | null, enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['ledger-members', user?.id, ledgerId] as const,
    queryFn: () => listLedgerMembers(ledgerId!),
    enabled: !!user && !!ledgerId && enabled,
  })
}

/**
 * Số dư từ trước tới nay của một sổ. Key nằm dưới tiền tố `['expenses', userId]`
 * nên mọi thêm/sửa/xoá chi tiêu đều làm mới nó cùng danh sách.
 */
export function useLedgerBalance(ledgerId: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['expenses', user?.id, ledgerId, 'balance'] as const,
    queryFn: () => getLedgerBalance(ledgerId!),
    enabled: !!user && !!ledgerId,
  })
}

function useInvalidateLedgers() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ledgersQueryKey(user?.id) })
}

export function useCreateLedger() {
  const { user } = useAuth()
  const invalidate = useInvalidateLedgers()
  return useMutation({
    mutationFn: ({ name, emoji }: { name: string; emoji: string }) =>
      createLedger(user!.id, name, emoji),
    onSuccess: invalidate,
  })
}

export function useUpdateLedger() {
  const invalidate = useInvalidateLedgers()
  return useMutation({
    mutationFn: ({ id, name, emoji }: { id: string; name: string; emoji: string }) =>
      updateLedger(id, { name: name.trim(), emoji }),
    onSuccess: invalidate,
  })
}

export function useDeleteLedger() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateLedgers()
  return useMutation({
    mutationFn: (id: string) => deleteLedger(id),
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: ['expenses', user?.id, id] })
      await invalidate()
    },
  })
}

export function useSetLedgerInvite() {
  const invalidate = useInvalidateLedgers()
  return useMutation({
    mutationFn: ({ ledgerId, enabled }: { ledgerId: string; enabled: boolean }) =>
      setLedgerInvite(ledgerId, enabled),
    onSuccess: invalidate,
  })
}

export function useJoinLedger() {
  const invalidate = useInvalidateLedgers()
  return useMutation({
    mutationFn: (code: string) => joinLedger(code),
    onSuccess: invalidate,
  })
}

export function useRemoveLedgerMember() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateLedgers()
  return useMutation({
    mutationFn: ({ ledgerId, userId }: { ledgerId: string; userId: string }) =>
      removeLedgerMember(ledgerId, userId),
    onSuccess: async (_data, { ledgerId }) => {
      await queryClient.invalidateQueries({ queryKey: ['ledger-members', user?.id, ledgerId] })
      await invalidate()
    },
  })
}
