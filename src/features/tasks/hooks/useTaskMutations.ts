import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import { useAuth } from '@/features/auth/AuthContext'
import { addDays, parseISODate, toISODate } from '@/lib/utils/date'
import {
  bulkCreateTasks,
  createTask,
  deleteTask,
  listTasksForRange,
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

interface CreateTasksOnDaysVars {
  title: string
  categoryId: string | null
  taskDates: string[]
  startMinute: number
  durationMinute: number
}

/** Creates the same task on every date in `taskDates` in one request — used for "repeat on these days". */
export function useCreateTasksOnDays(weekStartISO: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = tasksQueryKey(user?.id, weekStartISO)

  return useMutation({
    mutationFn: (input: CreateTasksOnDaysVars) =>
      bulkCreateTasks(
        input.taskDates.map((taskDate) => ({
          user_id: user!.id,
          category_id: input.categoryId,
          title: input.title,
          task_date: taskDate,
          start_minute: input.startMinute,
          duration_minute: input.durationMinute,
        })),
      ),
    onSuccess: (created) => {
      queryClient.setQueryData<Task[]>(key, (prev) => [...(prev ?? []), ...created])
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
