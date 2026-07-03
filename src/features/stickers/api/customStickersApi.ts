import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export type CustomStickerRow = Database['public']['Tables']['custom_stickers']['Row']
export type CustomStickerInsert = Database['public']['Tables']['custom_stickers']['Insert']

export async function listCustomStickers(userId: string): Promise<CustomStickerRow[]> {
  const { data, error } = await supabase
    .from('custom_stickers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createCustomStickers(inputs: CustomStickerInsert[]): Promise<CustomStickerRow[]> {
  const { data, error } = await supabase.from('custom_stickers').insert(inputs).select('*')
  if (error) throw error
  return data
}

export async function deleteCustomSticker(id: string): Promise<void> {
  const { error } = await supabase.from('custom_stickers').delete().eq('id', id)
  if (error) throw error
}
