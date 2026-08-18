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

/**
 * Escapes the wildcards Postgres' LIKE treats specially, so searching for
 * "100%" looks for that literal text instead of matching everything.
 */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (char) => '\\' + char)
}

/** Title search across every week, newest first. Used by the search modal. */
export async function searchTasks(userId: string, query: string, limit = 50): Promise<Task[]> {
  const term = query.trim()
  if (term.length === 0) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .ilike('title', `%${escapeLikeWildcards(term)}%`)
    .order('task_date', { ascending: false })
    .order('start_minute', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

/**
 * Applies a patch to one repeat series from `fromDate` onwards — never to
 * occurrences already in the past, which stay as a record of what was planned.
 * `task_date` is deliberately not patchable here: every occurrence sits on its
 * own date, so writing one date across the series would collapse them.
 */
export async function updateSeriesFrom(
  userId: string,
  seriesId: string,
  fromDate: string,
  patch: Omit<TaskUpdate, 'task_date' | 'series_id'>,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .gte('task_date', fromDate)
    .select('*')
  if (error) throw error
  return data
}

/** Deletes one repeat series from `fromDate` onwards, leaving earlier occurrences in place. */
export async function deleteSeriesFrom(
  userId: string,
  seriesId: string,
  fromDate: string,
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .gte('task_date', fromDate)
  if (error) throw error
}
