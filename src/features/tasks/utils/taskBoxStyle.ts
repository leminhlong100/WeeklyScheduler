import {
  contrastRatio,
  mixSrgbHex,
  normalizeHex,
  rgba,
  solveLightnessForContrast,
} from '@/lib/utils/color'
import type { DerivedTheme } from '@/features/theme/types'

export interface TaskBoxStyle {
  bg: string
  fg: string
  border: string
  shadow: string
}

/**
 * Chữ của ô công việc phải đọc được với MỌI màu danh mục người dùng chọn —
 * kể cả vàng chanh hay hồng phấn. Giữ tông màu danh mục, chỉ kéo độ sáng tới
 * 4.5:1 trên nền của chính ô đó.
 */
const readableOn = (fg: string, bg: string) => solveLightnessForContrast(fg, bg, 4.6)

/** Tints a category's accent color into a soft task-block background/text pair. */
export function taskBoxStyle(color: string, theme: DerivedTheme, isCurrent = false): TaskBoxStyle {
  const base = normalizeHex(color)
  if (isCurrent) {
    return {
      bg: base,
      fg:
        contrastRatio('#ffffff', base) >= 4.5
          ? '#ffffff'
          : solveLightnessForContrast(base, base, 4.6, 'darker'),
      border: `1.5px solid ${mixSrgbHex(base, '#ffffff', 0.35)}`,
      shadow: `0 0 0 2px ${rgba(base, 0.35)}, 0 10px 24px ${rgba(base, 0.45)}`,
    }
  }
  if (theme.dark) {
    const bg = mixSrgbHex(base, '#1c1f3d', 0.62)
    return {
      bg,
      fg: readableOn(mixSrgbHex(base, '#ffffff', 0.72), bg),
      border: `1px solid ${rgba(base, 0.5)}`,
      shadow: '0 5px 14px rgba(0,0,0,.4)',
    }
  }
  const bg = mixSrgbHex(base, '#ffffff', 0.85)
  return {
    bg,
    fg: readableOn(mixSrgbHex(base, '#3a2f52', 0.22), bg),
    border: `1px solid ${rgba(base, 0.3)}`,
    shadow: `0 4px 12px ${rgba(base, 0.2)}`,
  }
}
