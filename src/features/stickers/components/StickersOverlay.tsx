import { useEffect, useState, type ReactNode } from 'react'
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
  /** Lifted up to SchedulerPage so the mobile "..." menu can also drive these. */
  editMode: boolean
  trayOpen: boolean
  onCloseTray: () => void
  onToggleDesktopPanel: () => void
}

/**
 * Composes the full drag-and-drop sticker feature: the library panel, the
 * placed-sticker layer, and the drag ghost. Everything here is fixed to the
 * viewport's right edge (outside the calendar, not a layout sibling of it),
 * so it floats over the page background instead of resizing or covering the
 * schedule grid.
 *
 * The catalog toggle and edit-mode toggle only render here as a single
 * merged floating button, on desktop — on mobile they live in the header's
 * "..." menu instead, so they can't be tapped by accident while scrolling
 * the calendar.
 */
export function StickersOverlay({
  t,
  theme,
  children,
  editMode,
  trayOpen,
  onCloseTray,
  onToggleDesktopPanel,
}: StickersOverlayProps) {
  const [category, setCategory] = useState<StickerCategory>(STICKER_CATEGORIES[0].id)
  const {
    stickers,
    selectedId,
    setSelectedId,
    addSticker,
    moveSticker,
    resizeSticker,
    rotateSticker,
    duplicateSticker,
    deleteSticker,
    clearAll,
  } = useStickers()
  const { customItems, isSyncing, addCustomStickers, removeCustomSticker } = useCustomStickers()
  const { placing, startPlace, startStickerDrag } = useStickerPointerInteractions({
    addSticker,
    moveSticker,
    resizeSticker,
    rotateSticker,
    onSelect: setSelectedId,
  })

  // Leaving edit mode clears the current selection focus, regardless of
  // which control (desktop button or mobile menu) turned it off.
  useEffect(() => {
    if (!editMode) setSelectedId(null)
  }, [editMode, setSelectedId])

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
        onPointerDownRotate={(e, sticker) => startStickerDrag(e, sticker, 'rotate')}
        onDuplicate={duplicateSticker}
        onDelete={deleteSticker}
      />
      <PlacingGhost placing={placing} />

      {createPortal(
        <div className="fixed right-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[40] flex flex-col items-end gap-2.5 sm:right-[22px] sm:bottom-[22px] sm:z-[92]">
          {trayOpen && (
            <StickerDock
              t={t}
              theme={theme}
              category={category}
              onCategoryChange={setCategory}
              onClose={onCloseTray}
              onItemPointerDown={startPlace}
              onClearAll={clearAll}
              customItems={customItems}
              isSyncingCustom={isSyncing}
              onAddCustom={handleAddCustom}
              onRemoveCustom={removeCustomSticker}
            />
          )}
          {/* Mobile drives this from the header's "..." menu instead — a floating
              FAB here would be too easy to tap by accident while scrolling. */}
          <GradientButton
            onClick={onToggleDesktopPanel}
            className={cn(
              'hidden h-11 justify-center gap-1.5 rounded-full transition-all sm:flex',
              trayOpen ? 'px-[15px] text-[12.5px]' : 'w-11',
            )}
          >
            <span className="text-[17px] leading-none">🌈</span>
            {trayOpen && t.stickers}
          </GradientButton>
        </div>,
        document.body,
      )}
    </>
  )
}
