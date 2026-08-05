import type { DerivedTheme } from '@/features/theme/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cssUrl } from '@/lib/utils/css'

/** Dim enough that task titles stay readable over the scenery. */
const DEFAULT_SCENE_OPACITY = 0.42

/** Characters shrink on phones so they don't crowd the single-day column. */
const MOBILE_FIGURE_SCALE = 0.62

interface ThemeArtLayerProps {
  theme: DerivedTheme
  variant: 'main' | 'sidebar'
}

/**
 * Illustration layers for the themes that ship artwork: scenery behind the week
 * grid (or the sidebar) plus character cut-outs along the bottom edge.
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
  const scene = isMain ? art.scene : art.sideScene
  const figures = isMain ? art.figures : undefined
  if (!scene && !figures?.length) return null

  const position = isMain ? (art.scenePosition ?? 'center bottom') : 'center'
  const scale = isMobile ? MOBILE_FIGURE_SCALE : 1

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {scene && (
        <div
          className="absolute inset-0"
          style={{
            opacity: art.sceneOpacity ?? DEFAULT_SCENE_OPACITY,
            background: `${cssUrl(scene)} ${position}/cover no-repeat`,
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
