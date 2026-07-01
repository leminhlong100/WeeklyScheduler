import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { listCategories } from '../api/categoriesApi'

export const categoriesQueryKey = (userId: string | undefined) => ['categories', userId] as const

export function useCategories() {
  const { user } = useAuth()

  return useQuery({
    queryKey: categoriesQueryKey(user?.id),
    queryFn: () => listCategories(user!.id),
    enabled: !!user,
  })
}
