import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@/lib/utils'

interface SliderProps extends Omit<SliderPrimitive.Root.Props, 'render'> {
  /** Unfilled part of the track. */
  trackColor?: string
  /** Filled part, from the minimum to the thumb. */
  rangeColor?: string
  thumbColor?: string
  className?: string
}

/**
 * A single-value slider.
 *
 * Colours are props rather than Tailwind tokens because the only consumer is the
 * theme studio, which paints from the live theme object — the same reason `Input`
 * is used with an inline `style` throughout this app.
 *
 * `onValueCommitted` (from the primitive) fires on pointer-up rather than on
 * every move, which is what callers should use for anything expensive.
 */
export function Slider({
  trackColor,
  rangeColor,
  thumbColor,
  className,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root data-slot="slider" {...props}>
      <SliderPrimitive.Control
        className={cn('flex h-5 w-full touch-none items-center select-none', className)}
      >
        <SliderPrimitive.Track
          className="h-1.5 w-full rounded-full"
          style={{ background: trackColor ?? 'var(--color-border)' }}
        >
          <SliderPrimitive.Indicator
            className="rounded-full"
            style={{ background: rangeColor ?? 'var(--color-primary)' }}
          />
          <SliderPrimitive.Thumb
            className="size-4 rounded-full shadow-sm outline-none transition-[box-shadow] focus-visible:ring-3 focus-visible:ring-current/30"
            style={{
              background: thumbColor ?? '#ffffff',
              border: `2px solid ${rangeColor ?? 'var(--color-primary)'}`,
              color: rangeColor,
            }}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
