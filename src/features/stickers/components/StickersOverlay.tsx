import { useRef, useState, type ReactNode } from 'react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { useStickers } from '../hooks/useStickers'
import { useStickerPointerInteractions } from '../hooks/useStickerPointerInteractions'
import { StickerLayer } from './StickerLayer'
import { PlacingGhost } from './PlacingGhost'
import { StickerTray } from './StickerTray'

interface StickersOverlayProps {
  t: Dictionary
  theme: DerivedTheme
  children: ReactNode
}

/**
 * Composes the full drag-and-drop sticker feature: tray, placed layer, drag
 * ghost. Wraps `children` (the schedule grid) so the placed-sticker layer
 * shares its box and scrolls together with it, rather than sitting fixed to
 * the viewport.
 */
export function StickersOverlay({ t, theme, children }: StickersOverlayProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const {
    stickers,
    selectedId,
    setSelectedId,
    addSticker,
    moveSticker,
    resizeSticker,
    duplicateSticker,
    deleteSticker,
    clearAll,
  } = useStickers()
  const { placing, startPlace, startStickerDrag } = useStickerPointerInteractions({
    boardRef,
    addSticker,
    moveSticker,
    resizeSticker,
    onSelect: setSelectedId,
  })

  // Toggling the sticker button off saves (stickers already persist to
  // localStorage on every change) and clears the current selection focus.
  const toggleEditing = () => {
    setEditing((wasEditing) => {
      if (wasEditing) setSelectedId(null)
      return !wasEditing
    })
  }

  return (
    <>
      <div ref={boardRef} className="relative">
        {children}
        <StickerLayer
          stickers={stickers}
          selectedId={selectedId}
          editing={editing}
          theme={theme}
          onPointerDownMove={(e, sticker) => startStickerDrag(e, sticker, 'move')}
          onPointerDownResize={(e, sticker) => startStickerDrag(e, sticker, 'resize')}
          onDuplicate={duplicateSticker}
          onDelete={deleteSticker}
        />
      </div>
      <PlacingGhost placing={placing} />
      <StickerTray
        t={t}
        theme={theme}
        open={editing}
        onToggleOpen={toggleEditing}
        onItemPointerDown={startPlace}
        onClearAll={clearAll}
      />
    </>
  )
}
