import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthContext'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { updateProfile, type ProfileUpdate } from '../api/profileApi'
import { profileQueryKey } from './useProfile'

export function useUpdateProfile() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(user!.id, patch),
    // Preferences are written by an effect, not by a button with its own error
    // state, so a dropped write used to be completely invisible: the new theme
    // stayed on screen, the row kept the old one, and the next device (or the
    // next reload) quietly disagreed. Ride out the transient failure, then say
    // so rather than leaving the two out of step in silence.
    retry: 2,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(user?.id), profile)
    },
    onError: () => {
      toast.error(t.somethingWentWrong)
    },
  })
}
