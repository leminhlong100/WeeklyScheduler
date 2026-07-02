/**
 * Hand-authored to mirror `supabase/migrations/0001_init.sql`.
 * Regenerate with `supabase gen types typescript` once the project is linked
 * and this file will still slot in as `Database` for the client below.
 */

export interface TaskNoteItem {
  id: string
  text: string
  done: boolean
}

export type Locale = 'vi' | 'en' | 'zh' | 'ja'
export type ThemeKey =
  | 'lavender'
  | 'mint'
  | 'strawberry'
  | 'caramel'
  | 'ocean'
  | 'midnight'
  | 'peach'
  | 'lemon'
  | 'grape'
  | 'cottoncandy'
  | 'sakura'
  | 'panda'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          locale: Locale
          theme: ThemeKey
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          locale?: Locale
          theme?: ThemeKey
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
          locale?: Locale
          theme?: ThemeKey
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string
          color: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          emoji?: string
          color: string
          sort_order?: number
        }
        Update: {
          name?: string
          emoji?: string
          color?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          task_date: string
          start_minute: number
          duration_minute: number
          notes: TaskNoteItem[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          task_date: string
          start_minute: number
          duration_minute: number
          notes?: TaskNoteItem[]
        }
        Update: {
          category_id?: string | null
          title?: string
          task_date?: string
          start_minute?: number
          duration_minute?: number
          notes?: TaskNoteItem[]
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
