import { mixColors, rgba } from '@/lib/utils/color'
import type { DerivedTheme } from '@/features/theme/types'

export interface TaskBoxStyle {
  bg: string
  fg: string
  border: string
  shadow: string
}

/** Tints a category's accent color into a soft task-block background/text pair. */
export function taskBoxStyle(color: string, theme: DerivedTheme, isCurrent = false): TaskBoxStyle {
  if (isCurrent) {
    return {
      bg: color,
      fg: '#ffffff',
      border: `1.5px solid ${mixColors(color, '#ffffff', 0.35)}`,
      shadow: `0 0 0 2px ${rgba(color, 0.35)}, 0 10px 24px ${rgba(color, 0.45)}`,
    }
  }
  if (theme.dark) {
    return {
      bg: mixColors(color, '#1c1f3d', 0.62),
      fg: mixColors(color, '#ffffff', 0.72),
      border: `1px solid ${rgba(color, 0.5)}`,
      shadow: '0 5px 14px rgba(0,0,0,.4)',
    }
  }
  return {
    bg: mixColors(color, '#ffffff', 0.85),
    fg: mixColors(color, '#3a2f52', 0.22),
    border: `1px solid ${rgba(color, 0.3)}`,
    shadow: `0 4px 12px ${rgba(color, 0.2)}`,
  }
}
