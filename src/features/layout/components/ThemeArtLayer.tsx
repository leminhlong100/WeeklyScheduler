import type { DerivedTheme } from '@/features/theme/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { cssUrl } from '@/lib/utils/css'

/** Dim enough that task titles stay readable over the scenery. */
const DEFAULT_SCENE_OPACITY = 0.42

/** Characters shrink on phones so they don't crowd the single-day column. */
const MOBILE_FIGURE_SCALE = 0.62

interface ThemeArtLayerProps {
  theme: DerivedTheme
  /**
   * `page` is the full-viewport backdrop drawn behind the window card; `main`
   * is the same scene seen *through* the card. See the alignment note below.
   */
  variant: 'page' | 'main' | 'sidebar'
}

/**
 * Illustration layers for the themes that ship artwork: scenery behind the week
 * grid (or the sidebar) plus character cut-outs along the bottom edge.
 *
 * On desktop the scene is painted across the whole page and again inside the
 * card's panes, so the picture spills past the window card instead of stopping
 * at its rounded edge. The copies stay in register because the in-card ones use
 * `background-attachment: fixed`, which sizes and positions them against the
 * viewport — exactly the box the `page` copy covers. The card then reads as
 * tinted glass over one continuous image: full strength outside, dimmed to
 * `sceneOpacity` inside where text has to stay legible.
 *
 * The sidebar joins that flow-through only when it has no `sideScene` of its
 * own: uploading one is an explicit "this pane gets its own picture", so it
 * keeps winning, centred in the pane as before.
 *
 * Fixed attachment is skipped on phones — the card is full-bleed there so there
 * is no outside to match, and mobile engines handle it poorly.
 *
 * Everything is drawn with `background-image` rather than `<img>` so a theme
 * whose art files aren't in place yet stays silently invisible instead of
 * showing broken-image icons — that's what lets the palettes ship first.
 *
 * Both URLs go through `cssUrl()`. They originate from user uploads, and the
 * schema already pins them to our own Storage bucket, but this is the sink where
 * a stray quote would escape the declaration — so it is escaped here too.
 */
export function ThemeArtLayer({ theme, variant }: ThemeArtLayerProps) {
  const isMobile = useIsMobile()
  const art = theme.art
  if (!art) return null

  const isMain = variant === 'main'
  const isPage = variant === 'page'
  const ownSideScene = variant === 'sidebar' ? art.sideScene : undefined
  const scene = ownSideScene ?? art.scene
  const figures = isMain ? art.figures : undefined
  if (!scene && !figures?.length) return null

  // The page backdrop is decoration over nothing, so it runs at full strength;
  // only the copies behind content are dimmed for the text sitting on them.
  if (isPage && (isMobile || !scene)) return null

  const flowsThrough = !isPage && !ownSideScene
  const position = ownSideScene ? 'center' : (art.scenePosition ?? 'center bottom')
  const scale = isMobile ? MOBILE_FIGURE_SCALE : 1

  return (
    <div
      className={cn(
        'pointer-events-none overflow-hidden',
        isPage ? 'fixed inset-0' : 'absolute inset-0',
      )}
      aria-hidden
    >
      {scene && (
        <div
          className="absolute inset-0"
          style={{
            opacity: isPage ? 1 : (art.sceneOpacity ?? DEFAULT_SCENE_OPACITY),
            background: `${cssUrl(scene)} ${position}/cover no-repeat`,
            backgroundAttachment: flowsThrough && !isMobile ? 'fixed' : undefined,
          }}
        />
      )}

      {figures?.map((figure, i) => (
        <div
          key={`${figure.src}-${i}`}
          className="absolute bottom-0"
          style={{
            left: figure.x,
            width: figure.h * scale,
            height: figure.h * scale,
            opacity: figure.opacity ?? 1,
            transform: `translateX(-50%)${figure.flip ? ' scaleX(-1)' : ''}`,
            background: `${cssUrl(figure.src)} center bottom/contain no-repeat`,
          }}
        />
      ))}
    </div>
  )
}
