import type { TaskNoteItem } from '@/lib/supabase/database.types'

export type { TaskNoteItem }

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
  /** The task's own colour. Null follows `categoryColor`. */
  color: string | null
  notes: TaskNoteItem[]
  done: boolean
  /** Set when the task came from a "repeat weekly" run; shared with its sibling occurrences. */
  seriesId: string | null
}

export const UNCATEGORIZED_EMOJI = '📌'
export const UNCATEGORIZED_COLOR = '#9aa0ac'

/**
 * The colour a task actually renders in.
 *
 * Stored as an override rather than a copy of the category colour, so a task
 * left alone keeps following its category when that category is recoloured —
 * only tasks the user deliberately painted break away.
 */
export function taskColor(task: Pick<TaskWithCategory, 'color' | 'categoryColor'>): string {
  return task.color ?? task.categoryColor
}
