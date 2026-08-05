import { useEffect, useRef } from 'react'
import { useTheme } from '@/features/theme/ThemeContext'
import { customThemeId, isThemeKey, parseCustomThemeId } from '@/features/theme/types'
import { useLocale } from '@/features/i18n/LocaleContext'
import { useProfile } from './useProfile'
import { useUpdateProfile } from './useUpdateProfile'

/**
 * Bridges the local theme/locale context (instant UI, localStorage-backed)
 * with the authoritative `profiles` row: hydrates local state from the
 * server once on login, then persists any later change back to the server.
 *
 * The theme selection spans two columns — `theme` holds the fallback preset and
 * `custom_theme_id` the user-authored theme on top of it — and they are written
 * in a single patch so they cannot drift apart.
 */
export function useProfilePreferenceSync() {
  const { data: profile } = useProfile()
  const { themeId, presetKey, setThemeId, isPreviewing } = useTheme()
  const { locale, setLocale } = useLocale()
  const updateProfile = useUpdateProfile()
  const hydrated = useRef(false)

  useEffect(() => {
    if (!profile || hydrated.current) return
    hydrated.current = true

    // The column is constrained to the preset list, but a row written by a
    // different build (or by hand) can still carry a value this client cannot
    // render — validate rather than trust.
    if (isThemeKey(profile.theme) && profile.theme !== presetKey) {
      setThemeId(profile.theme)
    }
    // Applied second on purpose: setting a preset clears any custom selection, so
    // the custom id has to land after it.
    if (profile.custom_theme_id) {
      setThemeId(customThemeId(profile.custom_theme_id))
    }
    if (profile.locale !== locale) setLocale(profile.locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  useEffect(() => {
    if (!hydrated.current || !profile) return
    // A live preview is a draft, not a choice. Persisting it would make an
    // abandoned edit stick across devices.
    if (isPreviewing) return

    const nextCustomId = parseCustomThemeId(themeId)
    const unchanged =
      profile.theme === presetKey && (profile.custom_theme_id ?? null) === nextCustomId
    if (unchanged) return

    updateProfile.mutate({ theme: presetKey, custom_theme_id: nextCustomId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, presetKey])

  useEffect(() => {
    if (!hydrated.current || !profile || profile.locale === locale) return
    updateProfile.mutate({ locale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])
}
