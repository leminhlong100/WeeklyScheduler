import { buildShapeDataUri } from '@/lib/utils/svgShapes'
import type { TrayItem } from '../types'

interface StickerVisualProps {
  item: TrayItem
  size: number
}

/** Renders one sticker's visual (SVG shape or emoji glyph) at a given size. */
export function StickerVisual({ item, size }: StickerVisualProps) {
  if (item.kind === 'svg') {
    return (
      <div
        className="h-full w-full"
        style={{
          background: `${buildShapeDataUri(item.shape, item.color)} center/contain no-repeat`,
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.16))',
        }}
      />
    )
  }
  return (
    <div style={{ fontSize: size * 0.82, lineHeight: 1, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.18))' }}>
      {item.ch}
    </div>
  )
}
