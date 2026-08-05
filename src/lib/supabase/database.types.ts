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

/**
 * A `jsonb` column, deliberately left opaque.
 *
 * The custom-theme columns could be typed as `ThemeRecipe`/`ThemeArt` and would
 * look tidier for it — which is exactly the problem. Declaring the happy-path
 * type invites consumers to read `row.recipe.accent` directly and skip
 * `parseCustomTheme`, and a row written by an older build would then flow
 * straight into the renderer. `Json` makes the validation step unavoidable.
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined }

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
  | 'cyber'
  | 'matrix'
  | 'basiclight'
  | 'basicdark'

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
          /**
           * Set when the user is on a theme they built. `theme` still holds the
           * preset to fall back to, so deleting a custom theme (which nulls this
           * via `on delete set null`) returns them to *their* preset rather than
           * a hard-coded default. Always written in the same patch as `theme`.
           */
          custom_theme_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          locale?: Locale
          theme?: ThemeKey
          custom_theme_id?: string | null
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
          locale?: Locale
          theme?: ThemeKey
          custom_theme_id?: string | null
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
          /** Overrides the category's colour. Null follows the category. */
          color: string | null
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
          color?: string | null
        }
        Update: {
          category_id?: string | null
          title?: string
          task_date?: string
          start_minute?: number
          duration_minute?: number
          notes?: TaskNoteItem[]
          color?: string | null
        }
        Relationships: []
      }
      custom_themes: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          recipe: Json
          overrides: Json
          art: Json | null
          created_at: string
          updated_at: string
        }
        /** `id` is client-supplied: the Storage path for a theme's artwork
         * embeds the theme id, so it has to exist before the first upload. */
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          recipe: Json
          overrides?: Json
          art?: Json | null
        }
        Update: {
          name?: string
          icon?: string
          recipe?: Json
          overrides?: Json
          art?: Json | null
        }
        Relationships: []
      }
      custom_stickers: {
        Row: {
          id: string
          user_id: string
          src: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          src: string
        }
        Update: {
          src?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
