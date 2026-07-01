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
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PlacedSticker[]) : seedStickers()
  } catch {
    return seedStickers()
  }
}

export function useStickers() {
  const [stickers, setStickers] = useState<PlacedSticker[]>(readStoredStickers)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stickers))
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
    duplicateSticker,
    deleteSticker,
    clearAll,
  }
}
