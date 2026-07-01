import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { createTask, deleteTask, updateTask, type Task, type TaskUpdate } from '../api/tasksApi'
import { tasksQueryKey } from './useTasksForWeek'

interface CreateTaskVars {
  title: string
  categoryId: string | null
  taskDate: string
  startMinute: number
  durationMinute: number
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
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<Task[]>(key, (prev) => [...(prev ?? []), created])
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
