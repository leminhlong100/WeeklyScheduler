import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { PlacedSticker, TrayItem } from '../types'

export interface PlacingGhostState {
  item: TrayItem
  x: number
  y: number
}

type DragMode = 'move' | 'resize'

interface DragState {
  id: string
  mode: DragMode
  pointerStartX: number
  pointerStartY: number
  originX: number
  originY: number
  originSize: number
}

interface UseStickerPointerInteractionsOptions {
  addSticker: (item: TrayItem, x: number, y: number) => void
  moveSticker: (id: string, x: number, y: number) => void
  resizeSticker: (id: string, size: number) => void
  onSelect: (id: string) => void
}

/** Drag-to-place from the tray, and drag-to-move/resize an existing sticker. */
export function useStickerPointerInteractions({
  addSticker,
  moveSticker,
  resizeSticker,
  onSelect,
}: UseStickerPointerInteractionsOptions) {
  const [placing, setPlacing] = useState<PlacingGhostState | null>(null)
  const placingItemRef = useRef<TrayItem | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const addStickerRef = useRef(addSticker)
  const moveStickerRef = useRef(moveSticker)
  const resizeStickerRef = useRef(resizeSticker)
  useEffect(() => {
    addStickerRef.current = addSticker
    moveStickerRef.current = moveSticker
    resizeStickerRef.current = resizeSticker
  }, [addSticker, moveSticker, resizeSticker])

  useEffect(() => {
    function handleMove(e: globalThis.PointerEvent) {
      if (placingItemRef.current) {
        setPlacing({ item: placingItemRef.current, x: e.clientX, y: e.clientY })
        return
      }
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.pointerStartX
      const dy = e.clientY - drag.pointerStartY
      if (drag.mode === 'resize') {
        resizeStickerRef.current(drag.id, drag.originSize + (dx + dy) / 2)
      } else {
        moveStickerRef.current(drag.id, drag.originX + dx, drag.originY + dy)
      }
    }

    function handleUp(e: globalThis.PointerEvent) {
      if (placingItemRef.current) {
        const item = placingItemRef.current
        placingItemRef.current = null
        setPlacing(null)
        // Stickers are positioned relative to the viewport so they can be
        // dragged anywhere on screen, not just within the schedule grid.
        addStickerRef.current(item, e.clientX, e.clientY)
        return
      }
      dragRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [])

  const startPlace = useCallback((item: TrayItem, e: ReactPointerEvent) => {
    e.preventDefault()
    placingItemRef.current = item
    setPlacing({ item, x: e.clientX, y: e.clientY })
  }, [])

  const startStickerDrag = useCallback(
    (e: ReactPointerEvent, sticker: PlacedSticker, mode: DragMode) => {
      e.stopPropagation()
      e.preventDefault()
      dragRef.current = {
        id: sticker.id,
        mode,
        pointerStartX: e.clientX,
        pointerStartY: e.clientY,
        originX: sticker.x,
        originY: sticker.y,
        originSize: sticker.size,
      }
      onSelect(sticker.id)
    },
    [onSelect],
  )

  return { placing, startPlace, startStickerDrag }
}
