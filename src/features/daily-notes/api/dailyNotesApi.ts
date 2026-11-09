import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type DailyNote = Database['public']['Tables']['daily_notes']['Row']

export async function listDailyNotes(userId: string): Promise<DailyNote[]> {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .eq('user_id', userId)
    .order('note_date', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createDailyNote(input: {
  userId: string
  text: string
  noteDate: string
}): Promise<DailyNote> {
  const { data, error } = await supabase
    .from('daily_notes')
    .insert({ user_id: input.userId, text: input.text, note_date: input.noteDate })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function setDailyNoteDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('daily_notes').update({ done }).eq('id', id)
  if (error) throw error
}

export async function deleteDailyNote(id: string): Promise<void> {
  const { error } = await supabase.from('daily_notes').delete().eq('id', id)
  if (error) throw error
}
