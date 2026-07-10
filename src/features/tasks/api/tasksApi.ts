import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export async function listTasksForRange(
  userId: string,
  startISO: string,
  endISO: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('task_date', startISO)
    .lte('task_date', endISO)
    .order('start_minute', { ascending: true })
  if (error) throw error
  return data
}

export async function createTask(input: TaskInsert): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function bulkCreateTasks(inputs: TaskInsert[]): Promise<Task[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase.from('tasks').insert(inputs).select('*')
  if (error) throw error
  return data
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function bulkDeleteTasks(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('tasks').delete().in('id', ids)
  if (error) throw error
}

/** Applies the same partial patch to every task in `ids` — used by multi-select bulk edit. */
export async function bulkUpdateTasks(ids: string[], patch: TaskUpdate): Promise<Task[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('tasks').update(patch).in('id', ids).select('*')
  if (error) throw error
  return data
}
