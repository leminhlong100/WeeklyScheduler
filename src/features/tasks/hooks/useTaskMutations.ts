import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import { useAuth } from '@/features/auth/AuthContext'
import { addDays, parseISODate, toISODate } from '@/lib/utils/date'
import {
  bulkCreateTasks,
  bulkDeleteTasks,
  bulkUpdateTasks,
  createTask,
  deleteSeriesFrom,
  deleteTask,
  listTasksForRange,
  updateSeriesFrom,
  updateTask,
  type Task,
  type TaskUpdate,
} from '../api/tasksApi'
import type { TaskNoteItem } from '../types'
import { cloneNotes } from '../utils/cloneNotes'
import { tasksQueryKey } from './useTasksForWeek'

interface CreateTaskVars {
  title: string
  categoryId: string | null
  taskDate: string
  startMinute: number
  durationMinute: number
  notes?: TaskNoteItem[]
}

export function useCreateTask(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: (input: CreateTaskVars) =>
      createTask({
        user_id: user!.id,
        category_id: input.categoryId,
        title: input.title,
        task_date: input.taskDate,
        start_minute: input.startMinute,
        duration_minute: input.durationMinute,
        notes: input.notes ?? [],
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<Task[]>(key, (prev) => [...(prev ?? []), created])
    },
  })
}

interface CreateTaskOccurrencesVars {
  title: string
  categoryId: string | null
  taskDates: string[]
  startMinute: number
  durationMinute: number
  /** Set when the dates span several weeks, so the occurrences can later be edited or deleted as one series. */
  seriesId: string | null
}

/**
 * Creates the same task on every date in `taskDates` in one request — used both
 * for "repeat on these weekdays" (dates inside the current week) and for
 * "repeat weekly for N weeks" (dates spanning later weeks too).
 */
export function useCreateTaskOccurrences(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: (input: CreateTaskOccurrencesVars) =>
      bulkCreateTasks(
        input.taskDates.map((taskDate) => ({
          user_id: user!.id,
          category_id: input.categoryId,
          title: input.title,
          task_date: taskDate,
          start_minute: input.startMinute,
          duration_minute: input.durationMinute,
          series_id: input.seriesId,
        })),
      ),
    onSuccess: (created) => {
      // Only this week's occurrences belong in this week's cache entry; the
      // later ones land in weeks that may already be cached from an earlier
      // visit, so those entries are invalidated rather than left stale.
      const weekEndISO = toISODate(addDays(parseISODate(weekStartISO), 6))
      const thisWeek = created.filter(
        (task) => task.task_date >= weekStartISO && task.task_date <= weekEndISO,
      )
      if (thisWeek.length > 0) {
        queryClient.setQueryData<Task[]>(key, (prev) => [...(prev ?? []), ...thisWeek])
      }
      if (thisWeek.length !== created.length) {
        queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] })
      }
    },
  })
}

/**
 * Edits every occurrence of a repeat series from `fromDate` onwards. Touches
 * weeks other than the one on screen, so the whole task cache is refetched
 * rather than patched by hand.
 */
export function useUpdateTaskSeries() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      seriesId,
      fromDate,
      patch,
    }: {
      seriesId: string
      fromDate: string
      patch: Omit<TaskUpdate, 'task_date' | 'series_id'>
    }) => updateSeriesFrom(user!.id, seriesId, fromDate, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
  })
}

/** Deletes every occurrence of a repeat series from `fromDate` onwards. */
export function useDeleteTaskSeries() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ seriesId, fromDate }: { seriesId: string; fromDate: string }) =>
      deleteSeriesFrom(user!.id, seriesId, fromDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
  })
}

export function useUpdateTask(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdate }) => updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      const previous = queryClient.getQueryData<Task[]>(key)
      queryClient.setQueryData<Task[]>(key, (prev) =>
        (prev ?? []).map((task) => (task.id === id ? { ...task, ...patch } : task)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}

/** Copies every task from the week before `weekStart` into `weekStart`, shifting each date by 7 days. */
export function useCopyPreviousWeek(weekStart: Dayjs) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const weekStartISO = toISODate(weekStart)
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: async () => {
      const prevWeekStart = addDays(weekStart, -7)
      const prevWeekEnd = addDays(weekStart, -1)
      const prevTasks = await listTasksForRange(
        user!.id,
        toISODate(prevWeekStart),
        toISODate(prevWeekEnd),
      )
      const created = await bulkCreateTasks(
        prevTasks.map((task) => ({
          user_id: user!.id,
          category_id: task.category_id,
          title: task.title,
          task_date: toISODate(addDays(parseISODate(task.task_date), 7)),
          start_minute: task.start_minute,
          duration_minute: task.duration_minute,
          notes: cloneNotes(task.notes),
        })),
      )
      return created
    },
    onSuccess: (created) => {
      if (created.length === 0) return
      queryClient.setQueryData<Task[]>(key, (prev) => [...(prev ?? []), ...created])
    },
  })
}

export function useDeleteTask(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<Task[]>(key)
      queryClient.setQueryData<Task[]>(key, (prev) => (prev ?? []).filter((task) => task.id !== id))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}

/** Applies the same patch to many tasks at once — used by multi-select bulk edit. */
export function useUpdateTasks(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: TaskUpdate }) => bulkUpdateTasks(ids, patch),
    onMutate: async ({ ids, patch }) => {
      const previous = queryClient.getQueryData<Task[]>(key)
      const idSet = new Set(ids)
      queryClient.setQueryData<Task[]>(key, (prev) =>
        (prev ?? []).map((task) => (idSet.has(task.id) ? { ...task, ...patch } : task)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}

/** Deletes many tasks at once — used by "clear week" and multi-select delete. */
export function useDeleteTasks(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTasks(ids),
    onMutate: async (ids: string[]) => {
      const previous = queryClient.getQueryData<Task[]>(key)
      const idSet = new Set(ids)
      queryClient.setQueryData<Task[]>(key, (prev) => (prev ?? []).filter((task) => !idSet.has(task.id)))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}
