import { createPortal } from 'react-dom'
import type { PlacingGhostState } from '../hooks/useStickerPointerInteractions'
import { StickerVisual } from './StickerVisual'

const GHOST_SIZE = 58

export function PlacingGhost({ placing }: { placing: PlacingGhostState | null }) {
  if (!placing) return null

  // Portaled to body: rendered in place, the ghost is trapped inside the
  // app-shell card's stacking context (z-[1] at root), which the sticker
  // dock's own body-level portal (z-40) always paints over — so a drag
  // starting inside the dock stayed invisible until it left the dock.
  return createPortal(
    <div
      className="pointer-events-none fixed z-[130] grid place-items-center opacity-85"
      style={{
        left: placing.x,
        top: placing.y,
        width: GHOST_SIZE,
        height: GHOST_SIZE,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <StickerVisual item={placing.item} size={GHOST_SIZE} />
    </div>,
    document.body,
  )
}
