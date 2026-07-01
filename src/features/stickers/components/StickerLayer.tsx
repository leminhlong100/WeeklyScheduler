import type { PointerEvent } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import type { PlacedSticker } from '../types'
import { StickerVisual } from './StickerVisual'

interface StickerLayerProps {
  stickers: PlacedSticker[]
  selectedId: string | null
  editing: boolean
  theme: DerivedTheme
  onPointerDownMove: (e: PointerEvent, sticker: PlacedSticker) => void
  onPointerDownResize: (e: PointerEvent, sticker: PlacedSticker) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function StickerLayer({
  stickers,
  selectedId,
  editing,
  theme,
  onPointerDownMove,
  onPointerDownResize,
  onDuplicate,
  onDelete,
}: StickerLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[60]">
      {stickers.map((sticker) => {
        const selected = editing && sticker.id === selectedId
        return (
          <div
            key={sticker.id}
            onPointerDown={editing ? (e) => onPointerDownMove(e, sticker) : undefined}
            className={editing ? 'pointer-events-auto absolute grid touch-none place-items-center select-none' : 'pointer-events-none absolute grid touch-none place-items-center select-none'}
            style={{
              left: sticker.x,
              top: sticker.y,
              width: sticker.size,
              height: sticker.size,
              transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
              cursor: editing ? 'grab' : 'default',
              zIndex: selected ? 70 : 62,
            }}
          >
            {selected && (
              <div
                className="pointer-events-none absolute -inset-[9px] rounded-2xl border-2 border-dashed"
                style={{ borderColor: theme.accent }}
              />
            )}
            <StickerVisual item={sticker.item} size={sticker.size} />
            {selected && (
              <>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onDuplicate(sticker.id)
                  }}
                  className="absolute -top-[13px] -left-[13px] z-[3] grid h-[25px] w-[25px] place-items-center rounded-full bg-white text-[12px] leading-none shadow-md"
                  style={{ color: theme.accent, border: `1.5px solid ${theme.accent}` }}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onDelete(sticker.id)
                  }}
                  className="absolute -top-[13px] -right-[13px] z-[3] grid h-[25px] w-[25px] place-items-center rounded-full bg-[#ff5d7a] text-[15px] leading-none text-white shadow-md"
                >
                  ×
                </button>
                <div
                  onPointerDown={(e) => onPointerDownResize(e, sticker)}
                  className="absolute -right-[11px] -bottom-[11px] z-[3] h-[19px] w-[19px] cursor-nwse-resize rounded-full border-[2.5px] bg-white shadow-md"
                  style={{ borderColor: theme.accent }}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
