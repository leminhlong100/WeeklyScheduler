import { storageGet, storageSet } from '@/lib/utils/safeStorage'
import { useEffect, useState } from 'react'
import type { PlacedSticker } from '../types'

const STORAGE_KEY = 'weeklyScheduler.stickers'

function seedStickers(): PlacedSticker[] {
  const width = typeof window === 'undefined' ? 1024 : window.innerWidth
  return [
    { id: 'seed-1', item: { kind: 'emoji', ch: '🌟', category: 'nature' }, x: Math.round(width * 0.6), y: 150, size: 52, rot: -9 },
    { id: 'seed-2', item: { kind: 'emoji', ch: '☁️', category: 'nature' }, x: Math.round(width * 0.78), y: 120, size: 60, rot: 7 },
    { id: 'seed-3', item: { kind: 'emoji', ch: '🎀', category: 'love' }, x: Math.round(width * 0.46), y: 520, size: 48, rot: 11 },
  ]
}

function readStoredStickers(): PlacedSticker[] {
  if (typeof window === 'undefined') return []
  const raw = storageGet(STORAGE_KEY)
  if (!raw) return seedStickers()
  try {
    const parsed: unknown = JSON.parse(raw)
    // Một giá trị hỏng ("null", object…) từng làm `.map` sập cả trang Lịch tuần.
    return Array.isArray(parsed) ? parsed.filter(isPlacedSticker) : seedStickers()
  } catch {
    return seedStickers()
  }
}

function isPlacedSticker(v: unknown): v is PlacedSticker {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    Number.isFinite(s.x) &&
    Number.isFinite(s.y) &&
    Number.isFinite(s.size) &&
    Number.isFinite(s.rot) &&
    !!s.item &&
    typeof s.item === 'object'
  )
}

export function useStickers() {
  const [stickers, setStickers] = useState<PlacedSticker[]>(readStoredStickers)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    storageSet(STORAGE_KEY, JSON.stringify(stickers))
  }, [stickers])

  const addSticker = (item: PlacedSticker['item'], x: number, y: number) => {
    const id = crypto.randomUUID()
    setStickers((prev) => [...prev, { id, item, x, y, size: 58, rot: Math.random() * 24 - 12 }])
    setSelectedId(id)
  }

  const moveSticker = (id: string, x: number, y: number) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)))
  }

  const resizeSticker = (id: string, size: number) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, size: Math.max(26, Math.min(240, size)) } : s)))
  }

  const rotateSticker = (id: string, rot: number) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, rot } : s)))
  }

  const duplicateSticker = (id: string) => {
    const source = stickers.find((s) => s.id === id)
    if (!source) return
    const newId = crypto.randomUUID()
    setStickers((prev) => [...prev, { ...source, id: newId, x: source.x + 22, y: source.y + 22 }])
    setSelectedId(newId)
  }

  const deleteSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }

  const clearAll = () => {
    setStickers([])
    setSelectedId(null)
  }

  return {
    stickers,
    selectedId,
    setSelectedId,
    addSticker,
    moveSticker,
    resizeSticker,
    rotateSticker,
    duplicateSticker,
    deleteSticker,
    clearAll,
  }
}
