import type { DecorShape } from '@/lib/utils/svgShapes'

export type StickerCategory = 'shapes' | 'love' | 'nature' | 'animals' | 'food' | 'objects' | 'custom'

interface TrayShapeItem {
  kind: 'svg'
  shape: DecorShape
  color: string
  category: StickerCategory
}

interface TrayEmojiItem {
  kind: 'emoji'
  ch: string
  category: StickerCategory
}

/** A user-uploaded image sticker, kept in the tray alongside the built-in items. */
export interface TrayImageItem {
  kind: 'image'
  id: string
  src: string
  category: 'custom'
}

/** An entry in the sticker tray the user can drag onto the board. */
export type TrayItem = TrayShapeItem | TrayEmojiItem | TrayImageItem

/** A sticker placed on the board, persisted to localStorage. */
export interface PlacedSticker {
  id: string
  x: number
  y: number
  size: number
  rot: number
  item: TrayItem
}
