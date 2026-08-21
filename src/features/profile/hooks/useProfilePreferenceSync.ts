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
 *
 * Call it through `PreferenceSync`, once, above the router. Hydration is a
 * once-per-session step, so a second mount is not a second copy of a harmless
 * effect — it is a second chance to overwrite the user's latest choice with the
 * row it has not been written to yet.
 */
export function useProfilePreferenceSync() {
  const { data: profile } = useProfile()
  const { themeId, presetKey, setThemeId, isPreviewing } = useTheme()
  const { locale, setLocale } = useLocale()
  const updateProfile = useUpdateProfile()
  /**
   * Which account has been hydrated, rather than a plain "have we yet" flag.
   *
   * This hook now outlives every page, so signing out and into another account
   * is the one case that must hydrate a second time — and a boolean would leave
   * the second account looking at the first one's theme.
   */
  const hydratedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!profile || hydratedFor.current === profile.id) return
    hydratedFor.current = profile.id

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
    if (!profile || hydratedFor.current !== profile.id) return
    // A live preview is a draft, not a choice. Persisting it would make an
    // abandoned edit stick across devices. `isPreviewing` is a dependency, not
    // just a guard: the theme studio selects the theme it just saved while its
    // preview is still up, so without a re-run when the preview clears that
    // selection would never reach the row at all.
    if (isPreviewing) return

    const nextCustomId = parseCustomThemeId(themeId)
    const unchanged =
      profile.theme === presetKey && (profile.custom_theme_id ?? null) === nextCustomId
    if (unchanged) return

    updateProfile.mutate({ theme: presetKey, custom_theme_id: nextCustomId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, presetKey, isPreviewing])

  useEffect(() => {
    if (!profile || hydratedFor.current !== profile.id || profile.locale === locale) return
    updateProfile.mutate({ locale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])
}
