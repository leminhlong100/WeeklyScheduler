import type { PointerEvent } from 'react'
import { Move } from 'lucide-react'
import type { DerivedTheme } from '@/features/theme/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
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
  const isMobile = useIsMobile()
  // Touch needs roomier targets than a mouse cursor — the desktop sizes
  // (19–25px) are well under a fingertip, making the handles miserable to
  // hit. Offsets scale with the size so the controls stay just outside the
  // selection border.
  const btnSize = isMobile ? 34 : 25
  const btnOffset = isMobile ? -19 : -13
  const handleSize = isMobile ? 30 : 19
  const handleOffset = isMobile ? -17 : -11
  const rotateTop = isMobile ? -52 : -38
  // Stem runs from under the rotate handle down to the selection border
  // (which sits at -9px via -inset-[9px]); the top 12px hide behind the
  // handle's opaque circle.
  const stemTop = rotateTop + 12
  const stemHeight = -stemTop - 9

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
                  className="absolute z-[3] grid place-items-center rounded-full bg-white text-[12px] leading-none shadow-md"
                  style={{ top: btnOffset, left: btnOffset, height: btnSize, width: btnSize, color: theme.accent, border: `1.5px solid ${theme.accent}`, touchAction: 'none' }}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onDelete(sticker.id)
                  }}
                  className="absolute z-[3] grid place-items-center rounded-full bg-[#ff5d7a] text-[15px] leading-none text-white shadow-md"
                  style={{ top: btnOffset, right: btnOffset, height: btnSize, width: btnSize, touchAction: 'none' }}
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
                  className="absolute z-[3] grid place-items-center rounded-full border-[2.5px] bg-white shadow-md"
                  style={{ bottom: handleOffset, left: handleOffset, height: handleSize, width: handleSize, borderColor: theme.accent, color: theme.accent, cursor: 'grab', touchAction: 'none' }}
                >
                  <Move className={isMobile ? 'size-4' : 'size-3'} />
                </div>
                <div
                  onPointerDown={(e) => onPointerDownResize(e, sticker)}
                  className="absolute z-[3] cursor-nwse-resize rounded-full border-[2.5px] bg-white shadow-md"
                  style={{ bottom: handleOffset, right: handleOffset, height: handleSize, width: handleSize, borderColor: theme.accent, touchAction: 'none' }}
                />
                <div
                  className="pointer-events-none absolute left-1/2 z-[2] w-px -translate-x-1/2"
                  style={{ top: stemTop, height: stemHeight, background: theme.accent }}
                />
                <div
                  onPointerDown={(e) => onPointerDownRotate(e, sticker)}
                  className="absolute left-1/2 z-[3] grid -translate-x-1/2 place-items-center rounded-full border-[2.5px] bg-white text-[10px] leading-none shadow-md"
                  style={{ top: rotateTop, height: handleSize, width: handleSize, borderColor: theme.accent, color: theme.accent, cursor: 'grab', touchAction: 'none' }}
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
