import type { StickerCategory, TrayItem } from '../types'

export interface StickerCategoryInfo {
  id: StickerCategory
  emoji: string
}

/** Tabs shown above the sticker grid, in display order. */
export const STICKER_CATEGORIES: StickerCategoryInfo[] = [
  { id: 'love', emoji: '💗' },
  { id: 'nature', emoji: '🌸' },
  { id: 'animals', emoji: '🐻' },
  { id: 'food', emoji: '🍓' },
  { id: 'objects', emoji: '✏️' },
  { id: 'shapes', emoji: '⭐' },
  { id: 'custom', emoji: '📌' },
]

const SHAPE_ITEMS: TrayItem[] = [
  { kind: 'svg', shape: 'heart', color: '#ff7eb6', category: 'shapes' },
  { kind: 'svg', shape: 'heart', color: '#ff5d7a', category: 'shapes' },
  { kind: 'svg', shape: 'star', color: '#ffd15c', category: 'shapes' },
  { kind: 'svg', shape: 'star', color: '#8b7be8', category: 'shapes' },
  { kind: 'svg', shape: 'cloud', color: '#a9c8ff', category: 'shapes' },
  { kind: 'svg', shape: 'cloud', color: '#d6c8ff', category: 'shapes' },
  { kind: 'svg', shape: 'flower', color: '#ff9ec4', category: 'shapes' },
  { kind: 'svg', shape: 'flower', color: '#ffd15c', category: 'shapes' },
  { kind: 'svg', shape: 'rainbow', color: '', category: 'shapes' },
  { kind: 'svg', shape: 'sparkle', color: '#c9a2ff', category: 'shapes' },
  { kind: 'svg', shape: 'moon', color: '#ffcf6a', category: 'shapes' },
  { kind: 'svg', shape: 'leaf', color: '#5fd0a0', category: 'shapes' },
  { kind: 'svg', shape: 'bubble', color: '#7fd0e6', category: 'shapes' },
  { kind: 'svg', shape: 'bubble', color: '#ffb6b6', category: 'shapes' },
  { kind: 'svg', shape: 'dot', color: '#ffb3c7', category: 'shapes' },
  { kind: 'svg', shape: 'dot', color: '#a9c8ff', category: 'shapes' },
]

const EMOJI_BY_CATEGORY: Record<Exclude<StickerCategory, 'shapes' | 'custom'>, string[]> = {
  love: ['💖', '💕', '💗', '💓', '💞', '💘', '💝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🤍', '🖤', '💌', '🎀'],
  nature: ['🌸', '🌷', '🌻', '🌼', '🌹', '🌈', '⭐', '✨', '🌙', '☀️', '☁️', '🌟', '🍀', '🌿', '🌊', '❄️', '🔥', '💧'],
  animals: ['🐻', '🐰', '🐱', '🐶', '🐼', '🐣', '🦄', '🐥', '🐹', '🐨', '🦋', '🐝', '🐞', '🐢', '🦊', '🐟', '🦉', '🐬'],
  food: ['🍓', '🍰', '🧁', '🍪', '🍵', '☕', '🍡', '🍭', '🍬', '🍩', '🍉', '🍇', '🍒', '🍋', '🥐', '🍯', '🍎', '🍑'],
  objects: ['🎧', '📚', '✏️', '💡', '🧸', '📌', '📎', '🔖', '🎵', '🎈', '🎁', '📷', '👛', '💎', '⌚', '🔑', '👑', '🖍️'],
}

const EMOJI_ITEMS: TrayItem[] = (
  Object.entries(EMOJI_BY_CATEGORY) as [Exclude<StickerCategory, 'shapes' | 'custom'>, string[]][]
).flatMap(([category, chars]) => chars.map((ch) => ({ kind: 'emoji', ch, category }) as const))

export const STICKER_TRAY_ITEMS: TrayItem[] = [...EMOJI_ITEMS, ...SHAPE_ITEMS]
