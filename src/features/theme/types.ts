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
  brandGrad: string
  brandShadow: string
  pageBg: string
  windowShadow: string
  todayTint: string
  gridLinesImage: string
  danger: string
  dangerBorder: string
  sidebarText: string
  sidebarStrong: string
  sidebarMuted: string
  sidebarCard: string
  sidebarBorder: string
  scrollThumb: string
  scrollThumbHover: string
}
