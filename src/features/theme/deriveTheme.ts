import { isHex, relativeLuminance, rgba, solveLightnessForContrast } from '@/lib/utils/color'
import { HOUR_HEIGHT_PX } from '@/constants/grid'
import type { DerivedTheme, ThemeDefinition } from './types'

/** Adds computed gradients/shadows on top of a theme's static tokens. */
export function deriveTheme(def: ThemeDefinition): DerivedTheme {
  const { accent, dark, decorColors } = def
  const [c1 = accent, c2 = c1, c3 = c1] = decorColors
  const dotAlpha = dark ? 0.14 : 0.1

  // Nền "tối nhất" mà chữ phụ hay nằm trên (theme sáng) / sáng nhất (theme tối).
  // Đạt 4.5:1 trên nền đó thì đạt trên mọi nền thẻ còn lại.
  const surfaces = [def.chip, def.mainBg, def.panel, def.modalBg].filter(isHex)
  const worstBg = surfaces.length
    ? surfaces.reduce((a, b) =>
        dark
          ? relativeLuminance(b) > relativeLuminance(a)
            ? b
            : a
          : relativeLuminance(b) < relativeLuminance(a)
            ? b
            : a,
      )
    : dark
      ? '#2a2a3a'
      : '#f4f4f4'
  const readable = (color: string) =>
    solveLightnessForContrast(color, worstBg, 4.5, dark ? 'lighter' : 'darker')

  const pageBg = [
    `radial-gradient(circle at 14% 18%, ${rgba(c1, dark ? 0.55 : 0.95)}, transparent 42%)`,
    `radial-gradient(circle at 86% 12%, ${rgba(c2, dark ? 0.45 : 0.85)}, transparent 40%)`,
    `radial-gradient(circle at 78% 88%, ${rgba(c1, dark ? 0.4 : 0.8)}, transparent 44%)`,
    `radial-gradient(circle at 8% 82%, ${rgba(c3, dark ? 0.4 : 0.8)}, transparent 42%)`,
    `radial-gradient(${rgba(accent, dotAlpha)} 2px, transparent 2px) 0 0/26px 26px`,
    def.appBg,
  ].join(',')

  return {
    ...def,
    brandGrad: def.grad,
    brandShadow: rgba(accent, dark ? 0.5 : 0.32),
    pageBg,
    windowShadow: `0 34px 90px ${rgba(accent, dark ? 0.55 : 0.24)}, 0 10px 30px rgba(0,0,0,${dark ? 0.45 : 0.09})`,
    todayTint: rgba(accent, dark ? 0.16 : 0.08),
    gridLinesImage: `repeating-linear-gradient(to bottom,${def.gridLine},${def.gridLine} 1px,transparent 1px,transparent ${HOUR_HEIGHT_PX}px)`,
    danger: readable('#e0294b'),
    dangerBorder: 'rgba(255,93,122,.4)',
    sidebarText: '#ffffff',
    sidebarStrong: '#ffffff',
    sidebarMuted: 'rgba(255,255,255,0.78)',
    sidebarCard: 'rgba(255,255,255,0.16)',
    sidebarBorder: 'rgba(255,255,255,0.26)',
    // Translucent so the thumb reads as part of whatever it floats over — the
    // grid, the scenery behind it, or a modal — instead of a bar of flat colour.
    scrollThumb: rgba(accent, dark ? 0.5 : 0.34),
    scrollThumbHover: rgba(accent, dark ? 0.72 : 0.55),
    mutedText: readable(def.muted),
    income: readable(dark ? '#4fd8a8' : '#14a37b'),
    warning: readable(dark ? '#ffc65c' : '#b07300'),
    warningBg: rgba(dark ? '#ffc65c' : '#ffb020', dark ? 0.16 : 0.14),
  }
}
