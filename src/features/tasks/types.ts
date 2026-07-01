/** A task joined with its category's display info (emoji/color), or safe defaults if uncategorized. */
export interface TaskWithCategory {
  id: string
  title: string
  taskDate: string
  startMinute: number
  durationMinute: number
  categoryId: string | null
  categoryEmoji: string
  categoryColor: string
}

export const UNCATEGORIZED_EMOJI = '📌'
export const UNCATEGORIZED_COLOR = '#9aa0ac'
