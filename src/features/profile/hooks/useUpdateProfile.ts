import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { updateProfile, type ProfileUpdate } from '../api/profileApi'
import { profileQueryKey } from './useProfile'

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(user!.id, patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(user?.id), profile)
    },
  })
}
