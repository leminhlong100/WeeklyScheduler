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
]

/** Static design tokens for one theme, ported from the design's `themeDef()`. */
export interface ThemeDefinition {
  key: ThemeKey
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
}

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
}
