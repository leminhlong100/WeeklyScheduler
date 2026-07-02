import { useEffect, useState } from 'react'
import { readImageFileAsSticker } from '@/lib/utils/imageFile'
import type { TrayImageItem } from '../types'

const STORAGE_KEY = 'weeklyScheduler.customStickers'

function readStoredCustomStickers(): TrayImageItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TrayImageItem[]) : []
  } catch {
    return []
  }
}

/** User-uploaded image stickers, kept separate from the built-in catalog so they persist independently. */
export function useCustomStickers() {
  const [customItems, setCustomItems] = useState<TrayImageItem[]>(readStoredCustomStickers)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customItems))
  }, [customItems])

  const addCustomSticker = async (file: File): Promise<boolean> => {
    if (!file.type.startsWith('image/')) return false
    try {
      const src = await readImageFileAsSticker(file)
      const id = crypto.randomUUID()
      setCustomItems((prev) => [...prev, { kind: 'image', id, src, category: 'custom' }])
      return true
    } catch {
      return false
    }
  }

  const removeCustomSticker = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id))
  }

  return { customItems, addCustomSticker, removeCustomSticker }
}
