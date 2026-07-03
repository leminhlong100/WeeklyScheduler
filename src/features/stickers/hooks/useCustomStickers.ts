import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { readImageFileAsSticker } from '@/lib/utils/imageFile'
import { createCustomStickers, deleteCustomSticker, listCustomStickers } from '../api/customStickersApi'
import type { TrayImageItem } from '../types'

const LEGACY_STORAGE_KEY = 'weeklyScheduler.customStickers'

const customStickersQueryKey = (userId: string | undefined) => ['customStickers', userId] as const

function readLegacyLocalStickers(): TrayImageItem[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TrayImageItem[]) : []
  } catch {
    return []
  }
}

/** User-uploaded image stickers, synced through the account so they follow the user across devices. */
export function useCustomStickers() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = customStickersQueryKey(user?.id)
  const migratedRef = useRef(false)

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const rows = await listCustomStickers(user!.id)
      return rows.map((row): TrayImageItem => ({ kind: 'image', id: row.id, src: row.src, category: 'custom' }))
    },
    enabled: !!user,
  })

  const addMutation = useMutation({
    mutationFn: async (sources: string[]) => {
      const created = await createCustomStickers(sources.map((src) => ({ user_id: user!.id, src })))
      return created.map((row): TrayImageItem => ({ kind: 'image', id: row.id, src: row.src, category: 'custom' }))
    },
    onSuccess: (created) => {
      queryClient.setQueryData<TrayImageItem[]>(key, (prev) => [...(prev ?? []), ...created])
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCustomSticker(id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<TrayImageItem[]>(key)
      queryClient.setQueryData<TrayImageItem[]>(key, (prev) => (prev ?? []).filter((item) => item.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })

  // One-time migration: a device that uploaded stickers before sync existed
  // has them sitting in localStorage only — push them up once, then clear so
  // they aren't re-imported on every load.
  useEffect(() => {
    if (!user || migratedRef.current || query.isLoading) return
    migratedRef.current = true
    const legacy = readLegacyLocalStickers()
    if (legacy.length === 0) return
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    addMutation.mutate(legacy.map((item) => item.src))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, query.isLoading])

  const addCustomStickers = async (files: File[]): Promise<{ added: number; failed: number }> => {
    const results = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith('image/')) return null
        try {
          return await readImageFileAsSticker(file)
        } catch {
          return null
        }
      }),
    )
    const sources = results.filter((src): src is string => src !== null)
    if (sources.length > 0) await addMutation.mutateAsync(sources)
    return { added: sources.length, failed: files.length - sources.length }
  }

  const removeCustomSticker = (id: string) => removeMutation.mutate(id)

  return {
    customItems: query.data ?? [],
    isSyncing: query.isLoading || addMutation.isPending,
    addCustomStickers,
    removeCustomSticker,
  }
}
