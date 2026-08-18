import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { searchTasks } from '../api/tasksApi'

/** Below this many characters a search matches so much of the week that the result list is noise. */
export const MIN_SEARCH_LENGTH = 2

/**
 * Title search across every week, not just the one on screen. Kept out of the
 * `['tasks', userId, week]` key space so a search never overwrites (or gets
 * evicted by) the grid's own week queries.
 */
export function useTaskSearch(query: string) {
  const { user } = useAuth()
  const term = query.trim()

  return useQuery({
    queryKey: ['task-search', user?.id, term],
    queryFn: () => searchTasks(user!.id, term),
    enabled: !!user && term.length >= MIN_SEARCH_LENGTH,
    staleTime: 15_000,
  })
}
