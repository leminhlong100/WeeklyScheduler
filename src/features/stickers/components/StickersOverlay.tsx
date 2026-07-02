import { useState, type ReactNode } from 'react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { useStickers } from '../hooks/useStickers'
import { useCustomStickers } from '../hooks/useCustomStickers'
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
 * ghost. The placed-sticker layer is fixed to the viewport (not the schedule
 * grid) so stickers can be moved anywhere on screen.
 */
export function StickersOverlay({ t, theme, children }: StickersOverlayProps) {
  const [trayOpen, setTrayOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
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
  const { customItems, addCustomSticker, removeCustomSticker } = useCustomStickers()
  const { placing, startPlace, startStickerDrag } = useStickerPointerInteractions({
    addSticker,
    moveSticker,
    resizeSticker,
    onSelect: setSelectedId,
  })

  const toggleTrayOpen = () => {
    setTrayOpen((wasOpen) => {
      // Opening the catalog also turns on edit mode, so a freshly-dropped
      // sticker can be nudged into place right away.
      if (!wasOpen) setEditMode(true)
      return !wasOpen
    })
  }

  // Turning edit mode off saves (stickers already persist to localStorage on
  // every change) and clears the current selection focus.
  const toggleEditMode = () => {
    setEditMode((wasEditing) => {
      if (wasEditing) setSelectedId(null)
      return !wasEditing
    })
  }

  return (
    <>
      {children}
      <StickerLayer
        stickers={stickers}
        selectedId={selectedId}
        editing={editMode}
        theme={theme}
        onPointerDownMove={(e, sticker) => startStickerDrag(e, sticker, 'move')}
        onPointerDownResize={(e, sticker) => startStickerDrag(e, sticker, 'resize')}
        onDuplicate={duplicateSticker}
        onDelete={deleteSticker}
      />
      <PlacingGhost placing={placing} />
      <StickerTray
        t={t}
        theme={theme}
        open={trayOpen}
        editMode={editMode}
        onToggleOpen={toggleTrayOpen}
        onToggleEditMode={toggleEditMode}
        onItemPointerDown={startPlace}
        onClearAll={clearAll}
        customItems={customItems}
        onAddCustom={addCustomSticker}
        onRemoveCustom={removeCustomSticker}
      />
    </>
  )
}
