import { supabase } from '@/lib/supabase/client'
import type { Currency, Database } from '@/lib/supabase/database.types'

/**
 * Một yêu cầu nạp tiền vào sổ chia sẻ (migration 0017), như người đang đăng
 * nhập thấy: yêu cầu mình gửi, hoặc yêu cầu gửi vào sổ mình sở hữu.
 */
export type LedgerDeposit =
  Database['public']['Functions']['list_ledger_deposits']['Returns'][number]

export interface NewLedgerDeposit {
  ledgerId: string
  amount: number
  currency: Currency
  note: string
  depositedAt: string
}

/** `ledgerId` bỏ trống = mọi sổ (dùng ở sổ cá nhân của người nạp). */
export async function listLedgerDeposits(ledgerId: string | null): Promise<LedgerDeposit[]> {
  const { data, error } = await supabase.rpc('list_ledger_deposits', {
    p_ledger_id: ledgerId,
  })
  if (error) throw error
  // `numeric` có thể về dạng chuỗi tuỳ cấu hình PostgREST — ép cho chắc.
  return (data ?? []).map((d) => ({ ...d, amount: Number(d.amount) }))
}

/** Số yêu cầu đang chờ duyệt, theo từng sổ mình sở hữu. */
export async function countPendingDeposits(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('count_pending_ledger_deposits')
  if (error) throw error
  return new Map((data ?? []).map((r) => [r.ledger_id, Number(r.pending)] as const))
}

export async function createLedgerDeposit(input: NewLedgerDeposit): Promise<string> {
  const { data, error } = await supabase.rpc('create_ledger_deposit', {
    p_ledger_id: input.ledgerId,
    p_amount: input.amount,
    p_currency: input.currency,
    p_note: input.note,
    p_deposited_at: input.depositedAt,
  })
  if (error) throw error
  return data
}

export async function cancelLedgerDeposit(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_ledger_deposit', { p_id: id })
  if (error) throw error
}

export async function decideLedgerDeposit(
  id: string,
  approve: boolean,
  incomeNote: string,
): Promise<void> {
  const { error } = await supabase.rpc('decide_ledger_deposit', {
    p_id: id,
    p_approve: approve,
    p_income_note: incomeNote,
  })
  if (error) throw error
}
