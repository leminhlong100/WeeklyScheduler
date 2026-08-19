import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type ExpenseCategoryInsert = Database['public']['Tables']['expense_categories']['Insert']
export type ExpenseCategoryUpdate = Database['public']['Tables']['expense_categories']['Update']

export async function listExpenseCategories(userId: string): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createExpenseCategory(
  input: ExpenseCategoryInsert,
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateExpenseCategory(
  id: string,
  patch: ExpenseCategoryUpdate,
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const { error } = await supabase.from('expense_categories').delete().eq('id', id)
  if (error) throw error
}
