import type { Category } from '@/features/categories/api/categoriesApi'
import type { Task } from '../api/tasksApi'
import { UNCATEGORIZED_COLOR, UNCATEGORIZED_EMOJI } from '../types'

export interface CategoryStat {
  /** Category id, or null for the bucket holding tasks with no category. */
  id: string | null
  name: string | null
  emoji: string
  color: string
  taskCount: number
  minutes: number
  /** This category's share of the week's planned minutes, 0–1. */
  share: number
}

export interface WeekStats {
  taskCount: number
  doneCount: number
  totalMinutes: number
  doneMinutes: number
  busiestDayIndex: number | null
  /** Planned minutes per weekday, Monday first. */
  minutesByDay: number[]
  /** Non-empty categories only, largest first. */
  byCategory: CategoryStat[]
}

/**
 * Rolls one week's tasks up into the numbers the stats modal shows. Pure over
 * the tasks already loaded for the grid, so opening the modal costs no request.
 *
 * `dayIndexOf` maps a task date onto its Monday-first column; tasks that fall
 * outside the week are ignored, matching how the grid drops them.
 */
export function computeWeekStats(
  tasks: Task[],
  categories: Category[],
  dayIndexOf: (taskDate: string) => number,
): WeekStats {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const buckets = new Map<string | null, CategoryStat>()
  const minutesByDay = Array.from({ length: 7 }, () => 0)

  let taskCount = 0
  let doneCount = 0
  let totalMinutes = 0
  let doneMinutes = 0

  for (const task of tasks) {
    const dayIndex = dayIndexOf(task.task_date)
    if (dayIndex < 0 || dayIndex > 6) continue

    const minutes = task.duration_minute
    taskCount++
    totalMinutes += minutes
    minutesByDay[dayIndex] += minutes
    if (task.done) {
      doneCount++
      doneMinutes += minutes
    }

    const category = task.category_id ? categoryById.get(task.category_id) : undefined
    // A task whose category was deleted falls into the uncategorized bucket
    // rather than a ghost row named after a category that no longer exists.
    const key = category ? category.id : null
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.taskCount++
      bucket.minutes += minutes
    } else {
      buckets.set(key, {
        id: key,
        name: category ? category.name : null,
        emoji: category ? category.emoji : UNCATEGORIZED_EMOJI,
        color: category ? category.color : UNCATEGORIZED_COLOR,
        taskCount: 1,
        minutes,
        share: 0,
      })
    }
  }

  const byCategory = [...buckets.values()].sort(
    (a, b) => b.minutes - a.minutes || (a.name ?? '').localeCompare(b.name ?? ''),
  )
  for (const bucket of byCategory) {
    bucket.share = totalMinutes > 0 ? bucket.minutes / totalMinutes : 0
  }

  const busiestMinutes = Math.max(...minutesByDay)
  const busiestDayIndex = busiestMinutes > 0 ? minutesByDay.indexOf(busiestMinutes) : null

  return { taskCount, doneCount, totalMinutes, doneMinutes, busiestDayIndex, minutesByDay, byCategory }
}
