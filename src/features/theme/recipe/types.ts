import type { DecorShape } from '@/lib/utils/svgShapes'
import type { ThemeArt, ThemeDefinition, ThemeKey, ThemeTokens } from '../types'

/** Always a normalised `#rrggbb`. */
export type Hex = string

/**
 * How the panel surface is treated. Ten of the eleven shipped light presets use
 * a pure `#ffffff` panel, so that is the default rather than the exception.
 */
export type PaperStyle = 'pure' | 'tinted' | 'warm'

/**
 * In dark themes the line tokens are `rgba()` over the surface rather than hex,
 * which is what lets one value work on every surface. Whether that alpha is
 * white or accent-coloured is an aesthetic call, not something derivable — the
 * shipped presets prove it: `cyber` (accent chroma 0.146) tints its lines with
 * the accent while `panda` (higher chroma, 0.182) uses white.
 */
export type LineTint = 'white' | 'accent'

/** Sparse per-token patch from the builder's Advanced section. */
export type TokenOverrides = Partial<ThemeTokens>

/** The guided inputs. Everything else in a theme is derived from these. */
export interface ThemeRecipe {
  /** Which preset seeded this recipe; also the "reset" target. */
  basePreset: ThemeKey
  mode: 'light' | 'dark'
  accent: Hex
  /**
   * Gradient partner: second stop of `grad` and `appBg`, and the tail of
   * `sideGrad`. Not derivable from the accent — the presets disagree on even the
   * sign of the hue offset (lavender +51°, cottoncandy −51°), so it has to be an
   * input, with an "auto" button offering `shiftHue(accent, 65)`.
   */
  secondary: Hex
  /** Becomes `nowLine`. */
  highlight: Hex
  paper: PaperStyle
  /** 0..1, 0.5 neutral. Scales every chroma ratio, so 0 lands near-greyscale. */
  intensity: number
  /**
   * 0..1, darkening only. 0 is the lightest sidebar that still passes the white-
   * text guard; anything above the guard's ceiling would render identically, so
   * there is no "lighter" direction to offer.
   */
  sidebarDepth: number
  lineTint?: LineTint
  decor: DecorShape[]
  decorColors: Hex[]
}

/** Everything needed to render a user-authored theme, before `deriveTheme`. */
export interface CustomThemeDraft {
  name: string
  icon: string
  recipe: ThemeRecipe
  overrides: TokenOverrides
  art: ThemeArt | null
}

/**
 * A saved theme after validation, carrying both the editable source (`recipe` +
 * `overrides`) and the built `definition`.
 *
 * Both halves are cached together on purpose: the picker and the renderer want
 * the definition, the builder wants the recipe, and rebuilding the definition on
 * every render would re-run forty OKLCH conversions for every consumer of
 * `useTheme()`.
 */
export interface CustomThemeRecord extends CustomThemeDraft {
  id: string
  definition: ThemeDefinition
}
