import { cn } from '@/lib/utils'

interface ContrastBadgeProps {
  ratio: number
  /** Below this the pair is flagged. Defaults to the body-text floor. */
  threshold?: number
  className?: string
}

const AMBER = '#f0a92e'
const OK = '#2fb58c'

/**
 * A contrast ratio as a compact readout.
 *
 * Shown next to the colour it describes rather than collected in a summary,
 * because the number is only actionable while looking at the control that
 * changes it. The colour of the badge is fixed rather than themed — a warning
 * that restyles itself with the palette being warned about can vanish exactly
 * when it matters.
 */
export function ContrastBadge({ ratio, threshold = 4.5, className }: ContrastBadgeProps) {
  const passes = ratio >= threshold
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-px font-mono text-[10px] font-bold tabular-nums',
        className,
      )}
      style={{
        color: passes ? OK : AMBER,
        background: `${passes ? OK : AMBER}22`,
      }}
      title={`${ratio.toFixed(2)}:1 (min ${threshold}:1)`}
    >
      {ratio.toFixed(1)}
    </span>
  )
}
