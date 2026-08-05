import { hexToOklch, isHex, normalizeHex } from '@/lib/utils/color'
import type { ThemeDefinition, ThemeKey } from '../types'
import {
  DARK_SURFACES,
  LIGHT_SURFACES,
  SIDEBAR_DEPTH_RANGE,
  SIDEBAR_L,
  WARM_HUE,
} from './buildTheme'
import type { Hex, PaperStyle, ThemeRecipe } from './types'

/**
 * The inverse fit: given a finished theme, recover the guided inputs that would
 * rebuild something close to it.
 *
 * This is what makes "start from Lavender" mean anything — the builder opens with
 * every slider already sitting where that preset sits, so the first thing a user
 * drags moves away from a real design instead of away from a default. It does not
 * need to be lossless (`buildTokensFromRecipe` output is the truth once the user
 * touches anything); it needs every preset to land on a recipe whose rebuild is
 * recognisably the same theme.
 */

const HEX_GLOBAL = /#[0-9a-fA-F]{6}\b/g

function hexesIn(value: string): Hex[] {
  return value.match(HEX_GLOBAL)?.map((h) => h.toLowerCase()) ?? []
}

/** First hex in a token, whether it is a bare colour or a gradient. */
function firstHex(value: string | undefined, fallback: Hex): Hex {
  if (!value) return fallback
  if (isHex(value)) return normalizeHex(value, fallback)
  return hexesIn(value)[0] ?? fallback
}

/** The mid stop of a three-stop `sideGrad`; the one with the legibility floor. */
function midHex(value: string | undefined, fallback: Hex): Hex {
  const stops = value ? hexesIn(value) : []
  return stops[1] ?? stops[0] ?? fallback
}

/**
 * `paper` from the panel surface. Ten of the eleven light presets use a pure
 * white panel, so anything else is a deliberate tint — and a tint sitting near
 * the cream hue is the `warm` style rather than an accent-tinted one.
 */
function detectPaper(panel: string, accentHue: number): PaperStyle {
  const hex = firstHex(panel, '#ffffff')
  if (hex === '#ffffff') return 'pure'
  const { c, h } = hexToOklch(hex)
  if (c < 0.004) return 'pure'
  const towardWarm = Math.abs(((h - WARM_HUE + 540) % 360) - 180) > 150
  const towardAccent = Math.abs(((h - accentHue + 540) % 360) - 180) > 150
  return towardWarm && !towardAccent ? 'warm' : 'tinted'
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/**
 * Recovers `intensity` from how saturated the surfaces actually are.
 *
 * The forward direction multiplies every chroma ratio by `k = intensity + 0.5`,
 * so measuring one surface's chroma against what the table predicts at `k = 1`
 * inverts it. `border` (light) and `panel` (dark) are the probes: both are far
 * enough from the accent to have a real chroma signal, and neither is clamped by
 * `SURFACE_CHROMA_CAP` in any shipped preset.
 */
function detectIntensity(def: ThemeDefinition, accentChroma: number): number {
  if (accentChroma < 0.01) return 0.5
  const probe = def.dark
    ? { hex: firstHex(def.panel, ''), ratio: DARK_SURFACES.panel.c }
    : { hex: firstHex(def.border, ''), ratio: LIGHT_SURFACES.border.c }
  if (!probe.hex) return 0.5
  const expected = accentChroma * probe.ratio
  if (expected <= 0) return 0.5
  const k = hexToOklch(probe.hex).c / expected
  return clamp(k - 0.5, 0, 1)
}

/**
 * Recovers `sidebarDepth` from where the sidebar's mid stop actually sits.
 *
 * Presets authored lighter than the guard's ceiling read back as 0, which is
 * exact rather than lossy — the guard would darken them to the same place.
 */
function detectSidebarDepth(def: ThemeDefinition): number {
  const mid = midHex(def.sideGrad, '')
  if (!mid) return 0
  const band = def.dark ? 'dark' : 'light'
  return clamp((SIDEBAR_L[band] - hexToOklch(mid).l) / SIDEBAR_DEPTH_RANGE[band], 0, 1)
}

export function recipeFromDefinition(def: ThemeDefinition, basePreset: ThemeKey): ThemeRecipe {
  const accent = normalizeHex(def.accent, '#8b7be8')
  const { c: accentChroma, h: accentHue } = hexToOklch(accent)

  // The second stop of `grad` is exactly what the forward direction writes there.
  const gradStops = hexesIn(def.grad)
  const secondary = gradStops[1] ?? accent

  return {
    basePreset,
    mode: def.dark ? 'dark' : 'light',
    accent,
    secondary,
    highlight: firstHex(def.nowLine, accent),
    paper: def.dark ? 'tinted' : detectPaper(def.panel, accentHue),
    intensity: detectIntensity(def, accentChroma),
    sidebarDepth: detectSidebarDepth(def),
    // Dark presets express lines as alpha, so the tint is readable straight off
    // the string. Light presets are opaque hex surfaces where the distinction
    // does not exist, and 'white' is the value that reproduces them.
    lineTint: def.dark && !def.border.includes('255,255,255') ? 'accent' : 'white',
    decor: [...def.decor],
    decorColors: def.decorColors.map((c) => normalizeHex(c, accent)),
  }
}
