import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

/**
 * Một tháng chi tiêu, mới nhất lên đầu. Khoảng ngày là nửa mở `[start, end)` —
 * truyền mốc đầu tháng sau làm `endExclusiveISO` thì khỏi phải tính "ngày cuối
 * tháng" (28/29/30/31) ở chỗ gọi.
 */
export async function listExpensesInRange(
  userId: string,
  startISO: string,
  endExclusiveISO: string,
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('spent_at', startISO)
    .lt('spent_at', endExclusiveISO)
    .order('spent_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createExpense(input: ExpenseInsert): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(input).select('*').single()
  if (error) throw error
  return data
}

/** Lưu cả bảng nháp AI trong một round-trip — xem `bulkCreateTasks`. */
export async function bulkCreateExpenses(inputs: ExpenseInsert[]): Promise<Expense[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase.from('expenses').insert(inputs).select('*')
  if (error) throw error
  return data
}

export async function updateExpense(id: string, patch: ExpenseUpdate): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

/**
 * Sửa một chuỗi chi tiêu định kỳ từ `fromISO` trở đi — không đụng vào các kỳ đã
 * qua, vì đó là ghi chép số tiền đã thực sự trả. `spent_at` cố tình không sửa
 * được ở đây: mỗi kỳ nằm trên ngày riêng, ghi một ngày cho cả chuỗi sẽ dồn tất
 * cả về cùng một hôm.
 */
export async function updateExpenseSeriesFrom(
  userId: string,
  seriesId: string,
  fromISO: string,
  patch: Omit<ExpenseUpdate, 'spent_at' | 'series_id'>,
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .gte('spent_at', fromISO)
    .select('*')
  if (error) throw error
  return data
}

/** Xoá một chuỗi định kỳ từ `fromISO` trở đi, giữ nguyên các kỳ trước đó. */
export async function deleteExpenseSeriesFrom(
  userId: string,
  seriesId: string,
  fromISO: string,
): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .gte('spent_at', fromISO)
  if (error) throw error
}
