import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export async function listCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategory(input: CategoryInsert): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, patch: CategoryUpdate): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
