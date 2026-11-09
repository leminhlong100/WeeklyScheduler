import { supabase } from '@/lib/supabase/client'
import type { Currency, Database } from '@/lib/supabase/database.types'

export type Ledger = Database['public']['Tables']['ledgers']['Row']

/**
 * Một sổ như người đang đăng nhập thấy: sổ của mình (`role = 'owner'`) hoặc sổ
 * người khác mời mình xem (`role = 'viewer'`). Sổ "Cá nhân" không nằm ở đây —
 * nó là `ledger_id IS NULL`, xem migration 0014.
 */
export type LedgerSummary = Database['public']['Functions']['list_my_ledgers']['Returns'][number]

export interface LedgerMember {
  user_id: string
  display_name: string
  joined_at: string
}

export interface LedgerBalance {
  currency: Currency
  income: number
  expense: number
}

export async function listMyLedgers(): Promise<LedgerSummary[]> {
  const { data, error } = await supabase.rpc('list_my_ledgers')
  if (error) throw error
  return data ?? []
}

export async function createLedger(ownerId: string, name: string, emoji: string): Promise<Ledger> {
  const { data, error } = await supabase
    .from('ledgers')
    .insert({ owner_id: ownerId, name: name.trim(), emoji })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateLedger(
  id: string,
  patch: Database['public']['Tables']['ledgers']['Update'],
): Promise<Ledger> {
  const { data, error } = await supabase
    .from('ledgers')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Xoá sổ xoá luôn mọi khoản trong sổ (FK `on delete cascade`). */
export async function deleteLedger(id: string): Promise<void> {
  const { error } = await supabase.from('ledgers').delete().eq('id', id)
  if (error) throw error
}

/** Bật link mời (luôn ra mã MỚI, mã cũ hết hiệu lực) hoặc tắt hẳn. */
export async function setLedgerInvite(ledgerId: string, enabled: boolean): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_ledger_invite', {
    p_ledger_id: ledgerId,
    p_enabled: enabled,
  })
  if (error) throw error
  return data ?? null
}

export async function joinLedger(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_ledger', { p_code: code })
  if (error) throw error
  return data
}

export async function listLedgerMembers(ledgerId: string): Promise<LedgerMember[]> {
  const { data, error } = await supabase.rpc('list_ledger_members', { p_ledger_id: ledgerId })
  if (error) throw error
  return data ?? []
}

/** Chủ sổ gỡ một người xem, hoặc người xem tự rời sổ (truyền id của chính mình). */
export async function removeLedgerMember(ledgerId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('ledger_members')
    .delete()
    .eq('ledger_id', ledgerId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getLedgerBalance(ledgerId: string): Promise<LedgerBalance[]> {
  const { data, error } = await supabase.rpc('ledger_balance', { p_ledger_id: ledgerId })
  if (error) throw error
  // `numeric` có thể về dưới dạng chuỗi tuỳ cấu hình PostgREST — ép cho chắc.
  return (data ?? []).map((row) => ({
    currency: row.currency,
    income: Number(row.income),
    expense: Number(row.expense),
  }))
}

export function buildInviteLink(code: string): string {
  return `${window.location.origin}/join/${code}`
}
