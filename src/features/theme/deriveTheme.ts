import {
  contrastRatio,
  flattenAlpha,
  isHex,
  mixSrgbHex,
  relativeLuminance,
  rgba,
  solveLightnessForContrast,
  withWhiteContrastAtLeast,
} from '@/lib/utils/color'
import { HOUR_HEIGHT_PX } from '@/constants/grid'
import type { DerivedTheme, ThemeDefinition } from './types'

/** WCAG AA cho chữ thường. */
const TEXT_AA = 4.5
/**
 * Trắng trên nút màu nhấn đạt ít nhất mức này thì làm đậm nền nút một chút cho
 * đủ AA; dưới mức này (màu nhấn pastel/neon) nền phải đậm đi quá nhiều, nên đổi
 * sang chữ tối và giữ nguyên màu nút.
 */
const DARKEN_FILL_FROM = 3

const HEX_RE = /#[0-9a-fA-F]{6}\b/g
const hexStops = (css: string) => css.match(HEX_RE) ?? []
const lightest = (list: string[]) =>
  list.reduce((a, b) => (relativeLuminance(b) > relativeLuminance(a) ? b : a))
const darkest = (list: string[]) =>
  list.reduce((a, b) => (relativeLuminance(b) < relativeLuminance(a) ? b : a))
const worstContrast = (fg: string, bgs: string[]) =>
  Math.min(...bgs.map((bg) => contrastRatio(fg, bg)))

/**
 * Màu chữ đọc được trên mọi nền trong `bgs`: trắng nếu trắng đạt AA, nếu không
 * thì một bản rất tối cùng tông với `tint`. Chữ tối phải đạt trên nền tối nhất,
 * chữ trắng trên nền sáng nhất — mỗi hướng có nền "khó" riêng.
 */
function readableOn(bgs: string[], tint: string): string {
  if (worstContrast('#ffffff', bgs) >= TEXT_AA) return '#ffffff'
  const dark = solveLightnessForContrast(tint, darkest(bgs), TEXT_AA + 0.1, 'darker')
  return worstContrast(dark, bgs) >= worstContrast('#ffffff', bgs) ? dark : '#ffffff'
}

/**
 * Nền tô màu nhấn (một màu hex hoặc một `linear-gradient`) cùng màu chữ đạt AA
 * trên MỌI điểm dừng của nó.
 *
 * - Trắng đạt sẵn: giữ nguyên.
 * - Trắng gần đạt (≥ 3:1 trên mọi điểm): làm đậm những điểm còn thiếu, giữ chữ trắng.
 * - Còn lại (pastel, neon): chữ tối cùng tông màu nhấn; điểm dừng nào vẫn quá tối
 *   cho chữ đó (gradient đi từ sáng sang tối) thì làm sáng lên.
 */
function fillWithText(
  css: string,
  tint: string,
  keepWhite = false,
): { fill: string; text: string } {
  const stops = hexStops(css)
  if (!stops.length) return { fill: css, text: '#ffffff' }
  const white = worstContrast('#ffffff', stops)
  if (white >= TEXT_AA) return { fill: css, text: '#ffffff' }
  if (white >= DARKEN_FILL_FROM || keepWhite) {
    return {
      fill: css.replace(HEX_RE, (s) => withWhiteContrastAtLeast(s, TEXT_AA + 0.1)),
      text: '#ffffff',
    }
  }
  const text = solveLightnessForContrast(tint, darkest(stops), TEXT_AA + 0.1, 'darker')
  return {
    fill: css.replace(HEX_RE, (s) => solveLightnessForContrast(s, text, TEXT_AA + 0.1, 'lighter')),
    text,
  }
}

/** Chữ phụ: lẫn một phần màu nền cho nhạt đi, rồi kéo lại cho đủ AA. */
function softenedOn(fg: string, bgs: string[]): string {
  const goDarker = fg !== '#ffffff'
  const worst = goDarker ? darkest(bgs) : lightest(bgs)
  const candidate = mixSrgbHex(fg, worst, 0.28)
  return solveLightnessForContrast(candidate, worst, TEXT_AA + 0.1, goDarker ? 'darker' : 'lighter')
}

/**
 * Màu chữ thanh bên cho một `sideGrad`, cùng tương phản tệ nhất của nó trên mọi
 * nền thanh bên (các điểm dừng và lớp thẻ trắng 22% đè lên chúng).
 *
 * Dùng chung với `buildTheme`: công thức `v: 2` dựa vào con số `worst` để chỉnh
 * gradient cho tới khi chữ đạt 4.5:1.
 */
export function sidebarTextFor(
  sideGrad: string,
  accent: string,
): { text: string; worst: number; surfaces: string[] } {
  const sideStops = hexStops(sideGrad)
  const sideBase = sideStops.length ? sideStops : [accent]
  const surfaces = [...sideBase, ...sideBase.map((s) => flattenAlpha('#ffffff', 0.22, s))]
  const text = readableOn(surfaces, sideBase[Math.floor(sideBase.length / 2)])
  return { text, worst: worstContrast(text, surfaces), surfaces }
}

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

  const danger = readable('#e0294b')
  const income = readable(dark ? '#4fd8a8' : '#14a37b')

  // --- Thanh bên -------------------------------------------------------------
  // Trước đây chữ thanh bên luôn trắng; trên gradient pastel của theme sáng chỉ
  // đạt 1.15–2.66:1. Giờ chọn trắng hoặc chữ tối cùng tông theo gradient. Thẻ
  // và nút trong thanh bên là lớp trắng 13–22% đè lên gradient, nên tính cả các
  // nền đã phủ đó.
  const { text: sidebarText, surfaces: sideSurfaces } = sidebarTextFor(def.sideGrad, accent)
  const sidebarMuted = softenedOn(sidebarText, sideSurfaces)

  // --- Nút tô màu nhấn ---------------------------------------------------------
  // Chữ trắng trên `accent`/`grad` chỉ 1.3–4.7:1. Nền đặc và nền gradient tính
  // riêng: có theme gradient tối mà màu nhấn lại hồng nhạt (panda).
  const solid = fillWithText(accent, accent)
  // Nút đặc giữ được chữ trắng thì nút gradient cũng vậy, để hai loại nút cạnh
  // nhau trên cùng trang không đổi màu chữ lung tung.
  const gradient = fillWithText(def.grad, accent, solid.text === '#ffffff')

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
    brandGrad: gradient.fill,
    onBrand: gradient.text,
    accentFill: solid.fill,
    onAccent: solid.text,
    accentText: readable(accent),
    brandShadow: rgba(accent, dark ? 0.5 : 0.32),
    pageBg,
    windowShadow: `0 34px 90px ${rgba(accent, dark ? 0.55 : 0.24)}, 0 10px 30px rgba(0,0,0,${dark ? 0.45 : 0.09})`,
    todayTint: rgba(accent, dark ? 0.16 : 0.08),
    gridLinesImage: `repeating-linear-gradient(to bottom,${def.gridLine},${def.gridLine} 1px,transparent 1px,transparent ${HOUR_HEIGHT_PX}px)`,
    danger,
    onDanger: readableOn([danger], danger),
    dangerBorder: 'rgba(255,93,122,.4)',
    sidebarText,
    sidebarStrong: sidebarText,
    sidebarMuted,
    sidebarCard: 'rgba(255,255,255,0.16)',
    sidebarBorder: 'rgba(255,255,255,0.26)',
    // Translucent so the thumb reads as part of whatever it floats over — the
    // grid, the scenery behind it, or a modal — instead of a bar of flat colour.
    scrollThumb: rgba(accent, dark ? 0.5 : 0.34),
    scrollThumbHover: rgba(accent, dark ? 0.72 : 0.55),
    mutedText: readable(def.muted),
    income,
    onIncome: readableOn([income], income),
    warning: readable(dark ? '#ffc65c' : '#b07300'),
    warningBg: rgba(dark ? '#ffc65c' : '#ffb020', dark ? 0.16 : 0.14),
  }
}
