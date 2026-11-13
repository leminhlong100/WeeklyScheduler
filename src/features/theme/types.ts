import type { ThemeKey } from '@/lib/supabase/database.types'
import type { DecorShape } from '@/lib/utils/svgShapes'
import type { LocalizedText } from '@/features/i18n/types'

export type { ThemeKey }

export const THEME_KEYS: ThemeKey[] = [
  'lavender',
  'mint',
  'strawberry',
  'caramel',
  'ocean',
  'midnight',
  'peach',
  'lemon',
  'grape',
  'cottoncandy',
  'sakura',
  'panda',
  'cyber',
  'matrix',
  'basiclight',
  'basicdark',
]

export function isThemeKey(value: string): value is ThemeKey {
  return (THEME_KEYS as readonly string[]).includes(value)
}

/**
 * A user-authored theme's id. Prefixed rather than a bare uuid so a single
 * string can identify either a preset or a custom theme.
 */
export type CustomThemeId = `custom:${string}`

/** Either a built-in preset key or a user-authored theme. */
export type ThemeId = ThemeKey | CustomThemeId

export function isCustomThemeId(id: string): id is CustomThemeId {
  return id.startsWith('custom:')
}

export function customThemeId(uuid: string): CustomThemeId {
  return `custom:${uuid}`
}

/** Strips the `custom:` prefix. Returns null for preset keys. */
export function parseCustomThemeId(id: string): string | null {
  return isCustomThemeId(id) ? id.slice('custom:'.length) : null
}

/** One character cut-out anchored to the bottom edge of the week grid. */
export interface ThemeArtFigure {
  src: string
  /** CSS `left`, e.g. `'18%'` — the figure is centred on it. */
  x: string
  /** Height in px at desktop scale. */
  h: number
  flip?: boolean
  opacity?: number
}

/** Optional illustration layers: scenery behind the grid/sidebar plus figures. */
export interface ThemeArt {
  scene?: string
  /**
   * Portrait backdrop for phones. A landscape `scene` under `cover` on a tall
   * screen keeps only a narrow vertical strip of the picture, so phones prefer
   * this one and fall back to `scene` when it is absent.
   */
  mobileScene?: string
  sideScene?: string
  scenePosition?: string
  sceneOpacity?: number
  figures?: ThemeArtFigure[]
  /**
   * Colour statistics of `scene`, measured once at upload time so the builder's
   * contrast check never has to read pixels at render time.
   */
  sceneDarkestCell?: string
  sceneLightestCell?: string
  /** Same statistics for `mobileScene`. */
  mobileSceneDarkestCell?: string
  mobileSceneLightestCell?: string
}

/** Static design tokens for one theme, ported from the design's `themeDef()`. */
export interface ThemeDefinition {
  key: ThemeId
  name: LocalizedText
  icon: string
  accent: string
  grad: string
  appBg: string
  mainBg: string
  panel: string
  text: string
  muted: string
  border: string
  borderStrong: string
  chip: string
  inputBg: string
  modalBg: string
  gridLine: string
  nowLine: string
  dark: boolean
  sideGrad: string
  decor: DecorShape[]
  decorColors: string[]
  /** Only user-authored themes ship artwork; presets leave this undefined. */
  art?: ThemeArt
}

/** The pure design tokens — everything except identity and artwork. */
export type ThemeTokens = Omit<ThemeDefinition, 'key' | 'name' | 'icon' | 'art'>

/** Theme tokens plus derived values computed at runtime (gradients, shadows). */
export interface DerivedTheme extends ThemeDefinition {
  /**
   * Nền nút tô màu nhấn. Có thể đậm hơn `grad`/`accent` gốc một chút để chữ
   * `onAccent` đạt 4.5:1. Dùng cho nền đặc có chữ; viền và tô nhạt vẫn dùng `accent`.
   */
  brandGrad: string
  /** Màu chữ/biểu tượng trên `brandGrad`: trắng, hoặc chữ tối với màu nhấn nhạt/neon. */
  onBrand: string
  accentFill: string
  /** Như `onBrand`, cho nền đặc `accentFill`. */
  onAccent: string
  /** Màu nhấn dùng làm CHỮ (link, nhãn) trên nền thẻ, ≥ 4.5:1. */
  accentText: string
  brandShadow: string
  pageBg: string
  windowShadow: string
  todayTint: string
  gridLinesImage: string
  danger: string
  /** Chữ trên nút tô `danger` (Xoá). */
  onDanger: string
  dangerBorder: string
  /**
   * Màu chữ đọc được (≥ 4.5:1 trên `chip` và `mainBg`) cho các vai trò tiền tệ.
   * `muted` gốc của theme sáng chỉ 1.5–2.2:1 nên không dùng làm màu CHỮ được nữa.
   */
  mutedText: string
  /** Tiền vào / số dư dương. */
  income: string
  /** Chữ trên nền tô `income` (nút chọn "Thu"). */
  onIncome: string
  /** Kỳ dự kiến, sắp vượt hạn mức. */
  warning: string
  warningBg: string
  sidebarText: string
  sidebarStrong: string
  sidebarMuted: string
  sidebarCard: string
  sidebarBorder: string
  scrollThumb: string
  scrollThumbHover: string
}
