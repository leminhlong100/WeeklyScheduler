import { useEffect, useRef } from 'react'
import { useTheme } from '@/features/theme/ThemeContext'
import { useLocale } from '@/features/i18n/LocaleContext'
import { useProfile } from './useProfile'
import { useUpdateProfile } from './useUpdateProfile'

/**
 * Bridges the local theme/locale context (instant UI, localStorage-backed)
 * with the authoritative `profiles` row: hydrates local state from the
 * server once on login, then persists any later change back to the server.
 */
export function useProfilePreferenceSync() {
  const { data: profile } = useProfile()
  const { themeKey, setThemeKey } = useTheme()
  const { locale, setLocale } = useLocale()
  const updateProfile = useUpdateProfile()
  const hydrated = useRef(false)

  useEffect(() => {
    if (!profile || hydrated.current) return
    hydrated.current = true
    if (profile.theme !== themeKey) setThemeKey(profile.theme)
    if (profile.locale !== locale) setLocale(profile.locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  useEffect(() => {
    if (!hydrated.current || !profile || profile.theme === themeKey) return
    updateProfile.mutate({ theme: themeKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey])

  useEffect(() => {
    if (!hydrated.current || !profile || profile.locale === locale) return
    updateProfile.mutate({ locale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])
}
