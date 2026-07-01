import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchProfile } from '../api/profileApi'

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  })
}
