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

/**
 * Giữ theo từng khoản chi và không quy đổi khi lưu — tỷ giá đổi theo ngày, quy
 * đổi lúc ghi là làm hỏng dữ liệu gốc. Báo cáo tách tổng theo từng đơn vị.
 */
export type Currency = 'VND' | 'JPY' | 'USD'

/** 'ai' = do AI tách ra rồi user xác nhận; 'manual' = user tự nhập form. */
export type ExpenseSource = 'ai' | 'manual'
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
          done: boolean
          /** Shared by every occurrence created from one "repeat weekly" run; null for one-off tasks. */
          series_id: string | null
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
          done?: boolean
          series_id?: string | null
          color?: string | null
        }
        Update: {
          category_id?: string | null
          title?: string
          task_date?: string
          start_minute?: number
          duration_minute?: number
          notes?: TaskNoteItem[]
          done?: boolean
          series_id?: string | null
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
      expense_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string
          color: string
          /** Hạn mức tháng. Null = không đặt hạn mức (khác với 0). */
          monthly_budget: number | null
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
          monthly_budget?: number | null
          sort_order?: number
        }
        Update: {
          name?: string
          emoji?: string
          color?: string
          monthly_budget?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          /** Null khi danh mục đã bị xoá — khoản chi vẫn giữ, chỉ mất nhãn. */
          category_id: string | null
          /**
           * `numeric` phía Postgres. supabase-js trả về number, đủ chính xác cho
           * khoảng tiền của app; phép cộng tổng vẫn nên làm trên số nguyên VND.
           */
          amount: number
          currency: Currency
          note: string
          /** 'YYYY-MM-DD' — ngày tiêu, không phải ngày nhập. */
          spent_at: string
          source: ExpenseSource
          /** Câu gốc user nhập, giữ để sửa lại khi AI parse sai. Null với bản nhập tay. */
          raw_text: string | null
          /** Chung cho mọi kỳ của một chuỗi lặp hàng tháng. Null = khoản chi lẻ. */
          series_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          amount: number
          currency?: Currency
          note?: string
          spent_at: string
          source?: ExpenseSource
          raw_text?: string | null
          series_id?: string | null
        }
        Update: {
          category_id?: string | null
          amount?: number
          currency?: Currency
          note?: string
          spent_at?: string
          source?: ExpenseSource
          raw_text?: string | null
          series_id?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
