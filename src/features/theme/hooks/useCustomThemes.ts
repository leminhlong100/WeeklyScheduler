import { useEffect, useRef } from 'react'
import { useIsRestoring, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  createCustomTheme,
  deleteCustomTheme,
  listCustomThemes,
  newCustomThemeId,
  purgeOrphanThemeArt,
  updateCustomTheme,
} from '../api/customThemesApi'
import type { CustomThemeDraft, CustomThemeRecord } from '../recipe/types'
import { parseCustomTheme, parseCustomThemes } from '../utils/parseCustomTheme'

const customThemesQueryKey = (userId: string | undefined) => ['customThemes', userId] as const

/** Every art URL a set of themes points at, for the orphan sweep. */
function referencedArtUrls(themes: CustomThemeRecord[]): string[] {
  return themes.flatMap((theme) => {
    const art = theme.art
    if (!art) return []
    return [
      art.scene,
      art.sideScene,
      ...(art.figures ?? []).map((figure) => figure.src),
    ].filter((url): url is string => !!url)
  })
}

export interface UseCustomThemesResult {
  themes: CustomThemeRecord[]
  /** True while the account's themes are unknown — not the same as "none". */
  isLoading: boolean
  /** True once the list is authoritative. Gates the context's self-heal. */
  isReady: boolean
  saveTheme: (draft: CustomThemeDraft & { id?: string }) => Promise<CustomThemeRecord | null>
  removeTheme: (id: string) => Promise<void>
  isSaving: boolean
  newThemeId: () => string
}

/**
 * User-authored themes, synced through the account.
 *
 * The cache holds already-parsed `CustomThemeRecord`s rather than raw rows,
 * because `ThemeProvider` reads this on every render — running zod and forty
 * OKLCH conversions per render, for every consumer of `useTheme()`, is not
 * something to leave to chance.
 */
export function useCustomThemes(): UseCustomThemesResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = customThemesQueryKey(user?.id)
  const isRestoring = useIsRestoring()
  const sweptRef = useRef(false)

  const query = useQuery({
    queryKey: key,
    queryFn: async () => parseCustomThemes(await listCustomThemes(user!.id)),
    enabled: !!user,
  })

  const saveMutation = useMutation({
    mutationFn: async (draft: CustomThemeDraft & { id?: string }) => {
      const existing = draft.id
      const args = {
        id: existing ?? newCustomThemeId(),
        userId: user!.id,
        name: draft.name,
        icon: draft.icon,
        recipe: draft.recipe,
        overrides: draft.overrides,
        art: draft.art,
      }
      const row = existing ? await updateCustomTheme(args) : await createCustomTheme(args)
      return parseCustomTheme(row)
    },
    onSuccess: (saved) => {
      if (!saved) return
      queryClient.setQueryData<CustomThemeRecord[]>(key, (prev) => {
        const list = prev ?? []
        const index = list.findIndex((theme) => theme.id === saved.id)
        if (index === -1) return [...list, saved]
        const next = list.slice()
        next[index] = saved
        return next
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCustomTheme(user!.id, id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<CustomThemeRecord[]>(key)
      queryClient.setQueryData<CustomThemeRecord[]>(key, (prev) =>
        (prev ?? []).filter((theme) => theme.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })

  // `isRestoring` is the load-bearing half of this gate. While the persister
  // rehydrates IndexedDB, `useQuery` is paused and `isSuccess` is false, which is
  // indistinguishable from "fetched, empty" to anything downstream — and the
  // context's self-heal reads that as "the active theme no longer exists".
  const isReady = !!user && !isRestoring && query.isSuccess

  // One sweep per session, after the list is known. This is what eventually
  // reconciles the best-effort deletes in the API layer; failing it is fine.
  useEffect(() => {
    if (!isReady || sweptRef.current) return
    sweptRef.current = true
    const themes = query.data ?? []
    void purgeOrphanThemeArt(user!.id, referencedArtUrls(themes)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  return {
    themes: query.data ?? [],
    isLoading: !!user && (isRestoring || query.isLoading),
    isReady,
    saveTheme: (draft) => saveMutation.mutateAsync(draft),
    removeTheme: (id) => removeMutation.mutateAsync(id),
    isSaving: saveMutation.isPending,
    newThemeId: newCustomThemeId,
  }
}
