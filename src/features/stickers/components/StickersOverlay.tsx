import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { cn } from '@/lib/utils'
import { GradientButton } from '@/components/common/GradientButton'
import { STICKER_CATEGORIES } from '../data/stickerCatalog'
import type { StickerCategory } from '../types'
import { useStickers } from '../hooks/useStickers'
import { useCustomStickers } from '../hooks/useCustomStickers'
import { useStickerPointerInteractions } from '../hooks/useStickerPointerInteractions'
import { StickerLayer } from './StickerLayer'
import { PlacingGhost } from './PlacingGhost'
import { StickerDock } from './StickerDock'

interface StickersOverlayProps {
  t: Dictionary
  theme: DerivedTheme
  children: ReactNode
}

/**
 * Composes the full drag-and-drop sticker feature: the library panel, the
 * placed-sticker layer, and the drag ghost. Everything here is fixed to the
 * viewport's right edge (outside the calendar, not a layout sibling of it),
 * so it floats over the page background instead of resizing or covering the
 * schedule grid.
 */
export function StickersOverlay({ t, theme, children }: StickersOverlayProps) {
  const [trayOpen, setTrayOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [category, setCategory] = useState<StickerCategory>(STICKER_CATEGORIES[0].id)
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
  const { customItems, isSyncing, addCustomStickers, removeCustomSticker } = useCustomStickers()
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

  const handleAddCustom = async (files: File[]) => {
    const result = await addCustomStickers(files)
    if (result.failed > 0) toast.error(t.somethingWentWrong)
    return result
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

      {createPortal(
        <div className="fixed right-3 bottom-3 z-[92] flex flex-col items-end gap-2.5 sm:right-[22px] sm:bottom-[22px]">
          {trayOpen && (
            <StickerDock
              t={t}
              theme={theme}
              category={category}
              onCategoryChange={setCategory}
              onClose={() => setTrayOpen(false)}
              onItemPointerDown={startPlace}
              onClearAll={clearAll}
              customItems={customItems}
              isSyncingCustom={isSyncing}
              onAddCustom={handleAddCustom}
              onRemoveCustom={removeCustomSticker}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleEditMode}
              className={cn(
                'flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] font-extrabold shadow-lg transition-all',
                editMode ? 'px-[15px] text-[12.5px]' : 'w-11',
              )}
              style={{
                borderColor: editMode ? theme.accent : theme.border,
                background: editMode ? theme.accent : theme.panel,
                color: editMode ? '#fff' : theme.text,
              }}
            >
              <span className="text-[17px] leading-none">✏️</span>
              {editMode && t.editStickers}
            </button>
            <GradientButton
              onClick={toggleTrayOpen}
              className={cn('h-11 justify-center gap-1.5 rounded-full transition-all', trayOpen ? 'px-[15px] text-[12.5px]' : 'w-11')}
            >
              <span className="text-[17px] leading-none">🌈</span>
              {trayOpen && t.stickers}
            </GradientButton>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
