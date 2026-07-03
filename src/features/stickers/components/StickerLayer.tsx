import type { PointerEvent } from 'react'
import { Move } from 'lucide-react'
import type { DerivedTheme } from '@/features/theme/types'
import type { PlacedSticker } from '../types'
import { StickerVisual } from './StickerVisual'

interface StickerLayerProps {
  stickers: PlacedSticker[]
  selectedId: string | null
  editing: boolean
  theme: DerivedTheme
  onSelect: (id: string) => void
  onPointerDownMove: (e: PointerEvent, sticker: PlacedSticker) => void
  onPointerDownResize: (e: PointerEvent, sticker: PlacedSticker) => void
  onPointerDownRotate: (e: PointerEvent, sticker: PlacedSticker) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function StickerLayer({
  stickers,
  selectedId,
  editing,
  theme,
  onSelect,
  onPointerDownMove,
  onPointerDownResize,
  onPointerDownRotate,
  onDuplicate,
  onDelete,
}: StickerLayerProps) {
  return (
    // Kept below dialogs (z-50): an open modal must win every tap over a
    // placed sticker, even while sticker edit mode is also on — otherwise a
    // sticker sitting where a dialog's button is drawn silently swallows
    // the touch input.
    <div className="pointer-events-none fixed inset-0 z-[45]">
      {stickers.map((sticker) => {
        const selected = editing && sticker.id === selectedId
        return (
          <div
            key={sticker.id}
            // Touch drags only through the dedicated move handle below — a
            // swipe passing over the sticker's body must still scroll the
            // page. Mouse keeps the old grab-anywhere shortcut since it
            // never fights page scrolling the way touch does.
            onPointerDown={editing ? (e) => { if (e.pointerType !== 'touch') onPointerDownMove(e, sticker) } : undefined}
            onClick={editing ? () => onSelect(sticker.id) : undefined}
            className={editing ? 'pointer-events-auto absolute grid place-items-center select-none' : 'pointer-events-none absolute grid place-items-center select-none'}
            style={{
              left: sticker.x,
              top: sticker.y,
              width: sticker.size,
              height: sticker.size,
              transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
              cursor: editing ? 'pointer' : 'default',
              touchAction: editing ? 'pan-y' : 'auto',
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
                  style={{ color: theme.accent, border: `1.5px solid ${theme.accent}`, touchAction: 'none' }}
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
                  style={{ touchAction: 'none' }}
                >
                  ×
                </button>
                {/* Dedicated move handle — the only way touch relocates a sticker,
                    so a swipe elsewhere on it still scrolls the page. */}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onPointerDownMove(e, sticker)
                  }}
                  className="absolute -bottom-[11px] -left-[11px] z-[3] grid h-[19px] w-[19px] place-items-center rounded-full border-[2.5px] bg-white shadow-md"
                  style={{ borderColor: theme.accent, color: theme.accent, cursor: 'grab', touchAction: 'none' }}
                >
                  <Move className="size-3" />
                </div>
                <div
                  onPointerDown={(e) => onPointerDownResize(e, sticker)}
                  className="absolute -right-[11px] -bottom-[11px] z-[3] h-[19px] w-[19px] cursor-nwse-resize rounded-full border-[2.5px] bg-white shadow-md"
                  style={{ borderColor: theme.accent, touchAction: 'none' }}
                />
                <div
                  className="pointer-events-none absolute top-[-26px] left-1/2 z-[2] h-[17px] w-px -translate-x-1/2"
                  style={{ background: theme.accent }}
                />
                <div
                  onPointerDown={(e) => onPointerDownRotate(e, sticker)}
                  className="absolute top-[-38px] left-1/2 z-[3] grid h-[19px] w-[19px] -translate-x-1/2 place-items-center rounded-full border-[2.5px] bg-white text-[10px] leading-none shadow-md"
                  style={{ borderColor: theme.accent, color: theme.accent, cursor: 'grab', touchAction: 'none' }}
                >
                  ↻
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
