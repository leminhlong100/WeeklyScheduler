import { buildShapeDataUri } from '@/lib/utils/svgShapes'
import type { DerivedTheme } from '@/features/theme/types'

interface DecorPlacement {
  x: string
  y: string
  s: number
  o: number
  r: number
}

const MAIN_PLACEMENTS: DecorPlacement[] = [
  { x: '4%', y: '11%', s: 80, o: 0.55, r: -8 },
  { x: '91%', y: '8%', s: 60, o: 0.5, r: 12 },
  { x: '96%', y: '40%', s: 50, o: 0.45, r: 0 },
  { x: '85%', y: '82%', s: 70, o: 0.45, r: -6 },
  { x: '6%', y: '84%', s: 64, o: 0.48, r: 8 },
  { x: '50%', y: '4%', s: 44, o: 0.4, r: 0 },
  { x: '71%', y: '6%', s: 36, o: 0.5, r: 10 },
  { x: '26%', y: '6%', s: 34, o: 0.48, r: -10 },
  { x: '97%', y: '62%', s: 42, o: 0.42, r: 6 },
  { x: '3%', y: '46%', s: 38, o: 0.42, r: 0 },
  { x: '50%', y: '95%', s: 34, o: 0.4, r: 14 },
  { x: '16%', y: '95%', s: 30, o: 0.4, r: -6 },
  { x: '82%', y: '52%', s: 32, o: 0.4, r: 8 },
]

const SIDE_PLACEMENTS: DecorPlacement[] = [
  { x: '82%', y: '6%', s: 40, o: 0.5, r: -6 },
  { x: '14%', y: '4%', s: 26, o: 0.45, r: 8 },
  { x: '90%', y: '34%', s: 22, o: 0.5, r: 0 },
  { x: '8%', y: '52%', s: 30, o: 0.4, r: 10 },
  { x: '86%', y: '70%', s: 34, o: 0.4, r: -8 },
  { x: '20%', y: '90%', s: 28, o: 0.42, r: 6 },
]

const SIDE_SHAPES = ['cloud', 'star', 'sparkle', 'heart', 'cloud', 'star'] as const

interface DecorBackgroundProps {
  theme: DerivedTheme
  variant: 'main' | 'sidebar'
}

/** Floating cute decorative shapes (clouds/stars/hearts…), purely presentational. */
export function DecorBackground({ theme, variant }: DecorBackgroundProps) {
  const placements = variant === 'main' ? MAIN_PLACEMENTS : SIDE_PLACEMENTS

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {placements.map((p, i) => {
        const shape = variant === 'main' ? theme.decor[i % theme.decor.length] : SIDE_SHAPES[i % SIDE_SHAPES.length]
        const color = variant === 'main' ? theme.decorColors[i % theme.decorColors.length] : 'rgba(255,255,255,0.85)'
        const animation =
          shape === 'star' || shape === 'sparkle'
            ? `sched-twinkle ${3 + (i % 3)}s ease-in-out infinite ${i * 0.3}s`
            : `sched-float-y ${5 + (i % (variant === 'main' ? 4 : 3))}s ease-in-out infinite ${i * (variant === 'main' ? 0.4 : 0.35)}s`

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
              width: p.s,
              height: p.s,
              opacity: p.o,
              transform: `translate(-50%, -50%) rotate(${p.r}deg)`,
              background: `${buildShapeDataUri(shape, color)} center/contain no-repeat`,
              animation,
            }}
          />
        )
      })}
    </div>
  )
}
