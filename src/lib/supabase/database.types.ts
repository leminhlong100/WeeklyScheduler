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

/**
 * Tiền ra hay tiền vào. `amount` luôn dương ở cả hai — dấu nằm ở đây, không nằm
 * trong con số, nên không có chỗ nào phải nhớ quy ước dấu.
 */
export type ExpenseKind = 'expense' | 'income'

/**
 * 'paid' = đã thu/chi thật, được cộng vào tổng và số dư.
 * 'planned' = kỳ định kỳ chưa tới, hiện riêng và không cộng vào tổng.
 */
export type ExpenseStatus = 'paid' | 'planned'

/** Quyền của người được mời vào một sổ chia sẻ. Hiện chỉ có xem. */
export type LedgerRole = 'viewer'

/** Trạng thái một yêu cầu nạp tiền vào sổ chia sẻ (migration 0017). */
export type LedgerDepositStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

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
          /** Ngày bắt đầu kỳ hạn mức, 1–28 (1 = theo tháng dương lịch). */
          budget_cycle_start_day: number
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
          budget_cycle_start_day?: number
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
          locale?: Locale
          theme?: ThemeKey
          custom_theme_id?: string | null
          budget_cycle_start_day?: number
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
          /** Free-text description of the event. */
          content: string
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
          content?: string
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
          content?: string
        }
        Relationships: []
      }
      daily_notes: {
        Row: {
          id: string
          user_id: string
          note_date: string
          text: string
          done: boolean
          /** Birthday, party, anniversary… — highlighted on the mini calendar. */
          special: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note_date?: string
          text: string
          done?: boolean
          special?: boolean
        }
        Update: {
          note_date?: string
          text?: string
          done?: boolean
          special?: boolean
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
          /** Danh mục thu và danh mục chi tách hẳn — bộ chọn lọc theo cột này. */
          kind: ExpenseKind
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
          kind?: ExpenseKind
        }
        Update: {
          name?: string
          emoji?: string
          color?: string
          monthly_budget?: number | null
          sort_order?: number
          kind?: ExpenseKind
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
          /** Tiền ra hay tiền vào. `amount` dương ở cả hai trường hợp. */
          kind: ExpenseKind
          /** 'planned' = kỳ định kỳ chưa tới; không cộng vào tổng thực chi. */
          status: ExpenseStatus
          source: ExpenseSource
          /** Câu gốc user nhập, giữ để sửa lại khi AI parse sai. Null với bản nhập tay. */
          raw_text: string | null
          /** Chung cho mọi kỳ của một chuỗi lặp hàng tháng. Null = khoản chi lẻ. */
          series_id: string | null
          /** Null = sổ cá nhân của `user_id`; khác null = sổ chia sẻ (xem `ledgers`). */
          ledger_id: string | null
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
          kind?: ExpenseKind
          status?: ExpenseStatus
          source?: ExpenseSource
          raw_text?: string | null
          series_id?: string | null
          ledger_id?: string | null
        }
        Update: {
          category_id?: string | null
          amount?: number
          currency?: Currency
          note?: string
          spent_at?: string
          kind?: ExpenseKind
          status?: ExpenseStatus
          source?: ExpenseSource
          raw_text?: string | null
          series_id?: string | null
        }
        Relationships: []
      }
      ledgers: {
        Row: {
          id: string
          owner_id: string
          name: string
          emoji: string
          /** Null = link mời đang tắt. */
          invite_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          emoji?: string
        }
        Update: {
          name?: string
          emoji?: string
        }
        Relationships: []
      }
      ledger_members: {
        Row: {
          ledger_id: string
          user_id: string
          role: LedgerRole
          created_at: string
        }
        Insert: {
          ledger_id: string
          user_id: string
          role?: LedgerRole
        }
        Update: Record<string, never>
        Relationships: []
      }
      ledger_deposits: {
        Row: {
          id: string
          ledger_id: string
          from_user_id: string
          amount: number
          currency: Currency
          note: string
          deposited_at: string
          status: LedgerDepositStatus
          income_expense_id: string | null
          decided_at: string | null
          created_at: string
          updated_at: string
        }
        /** Chỉ ghi qua RPC (`create_ledger_deposit`, `decide_ledger_deposit`…). */
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      list_my_ledgers: {
        Args: Record<string, never>
        Returns: {
          id: string
          name: string
          emoji: string
          owner_id: string
          owner_name: string
          role: 'owner' | LedgerRole
          /** Chỉ có giá trị với sổ mình sở hữu. */
          invite_code: string | null
          created_at: string
        }[]
      }
      list_ledger_members: {
        Args: { p_ledger_id: string }
        Returns: { user_id: string; display_name: string; joined_at: string }[]
      }
      set_ledger_invite: {
        Args: { p_ledger_id: string; p_enabled: boolean }
        Returns: string | null
      }
      join_ledger: {
        Args: { p_code: string }
        Returns: string
      }
      ledger_balance: {
        Args: { p_ledger_id: string }
        Returns: { currency: Currency; income: number; expense: number }[]
      }
      list_ledger_deposits: {
        Args: { p_ledger_id?: string | null }
        Returns: {
          id: string
          ledger_id: string
          ledger_name: string
          ledger_emoji: string
          from_user_id: string
          from_name: string
          amount: number
          currency: Currency
          note: string
          deposited_at: string
          status: LedgerDepositStatus
          decided_at: string | null
          created_at: string
        }[]
      }
      count_pending_ledger_deposits: {
        Args: Record<string, never>
        Returns: { ledger_id: string; pending: number }[]
      }
      create_ledger_deposit: {
        Args: {
          p_ledger_id: string
          p_amount: number
          p_currency: Currency
          p_note: string
          p_deposited_at: string
        }
        Returns: string
      }
      cancel_ledger_deposit: {
        Args: { p_id: string }
        Returns: undefined
      }
      decide_ledger_deposit: {
        Args: { p_id: string; p_approve: boolean; p_income_note?: string }
        Returns: undefined
      }
    }
  }
}
