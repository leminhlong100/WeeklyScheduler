import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import { useAuth } from '@/features/auth/AuthContext'
import { addDays, toISODate } from '@/lib/utils/date'
import { listTasksForRange } from '../api/tasksApi'

export const tasksQueryKey = (userId: string | undefined, weekStartISO: string) =>
  ['tasks', userId, weekStartISO] as const

/** Loads every task for the Mon–Sun week starting at `weekStart`. */
export function useTasksForWeek(weekStart: Dayjs) {
  const { user } = useAuth()
  const weekStartISO = toISODate(weekStart)
  const weekEndISO = toISODate(addDays(weekStart, 6))

  return useQuery({
    queryKey: tasksQueryKey(user?.id, weekStartISO),
    queryFn: () => listTasksForRange(user!.id, weekStartISO, weekEndISO),
    enabled: !!user,
  })
}
