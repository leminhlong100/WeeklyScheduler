import type { PlacingGhostState } from '../hooks/useStickerPointerInteractions'
import { StickerVisual } from './StickerVisual'

const GHOST_SIZE = 58

export function PlacingGhost({ placing }: { placing: PlacingGhostState | null }) {
  if (!placing) return null

  return (
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
    </div>
  )
}
