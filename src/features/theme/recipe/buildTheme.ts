import {
  hexToOklch,
  lighten,
  mixOklch,
  normalizeHex,
  oklchToHex,
  rgba,
  shiftHue,
  solveLightnessForContrast,
  withWhiteContrastAtLeast,
} from '@/lib/utils/color'
import type { ThemeDefinition, ThemeId, ThemeTokens } from '../types'
import type { Hex, ThemeRecipe, TokenOverrides } from './types'

/**
 * Derivation tables, measured from the sixteen shipped presets rather than
 * guessed.
 *
 * Palettes here are authored to *perceived* lightness, not channel ratios: the
 * same token expressed as an absolute OKLCH lightness lands within 0.014 across
 * every light preset (see the table below), while an sRGB mix ratio for the same
 * token disagrees channel-to-channel even inside one palette. Chroma is equally
 * consistent once taken as a fraction of the accent's chroma. So each surface is
 * `oklch(<absolute L>, <accent chroma> * <ratio>, <accent hue>)`.
 *
 * Light surfaces, L_ok mean across 11 presets (standard deviation in brackets):
 *   panel 0.999 (.002) · mainBg 0.985 (.005) · inputBg 0.975 (.006)
 *   appBg 0.969 (.008) · chip 0.962 (.007) · gridLine 0.950 (.010)
 *   border 0.940 (.010) · borderStrong 0.909 (.014)
 *
 * Dark surfaces invert the *order*, not the values — `panel` is the lightest
 * surface, not the darkest:
 *   appBg 0.187 · inputBg 0.205 · mainBg 0.218 · panel 0.243
 */
export interface SurfaceSpec {
  l: number
  /** Multiplier on the accent's chroma. */
  c: number
}

export const LIGHT_SURFACES = {
  mainBg: { l: 0.985, c: 0.063 },
  inputBg: { l: 0.975, c: 0.095 },
  appBg: { l: 0.969, c: 0.115 },
  chip: { l: 0.962, c: 0.137 },
  gridLine: { l: 0.95, c: 0.168 },
  border: { l: 0.94, c: 0.203 },
  borderStrong: { l: 0.909, c: 0.289 },
} as const satisfies Record<string, SurfaceSpec>

export const DARK_SURFACES = {
  appBg: { l: 0.187, c: 0.156 },
  inputBg: { l: 0.205, c: 0.191 },
  mainBg: { l: 0.218, c: 0.18 },
  panel: { l: 0.243, c: 0.203 },
} as const satisfies Record<string, SurfaceSpec>

/**
 * Dark line tokens are alpha over the surface. White and accent tints are not
 * interchangeable at the same alpha — the accent-tinted presets run roughly 1.8x
 * higher (`cyber` border .16 vs `midnight` .09) because a mid-chroma colour
 * carries less contrast against a dark surface than pure white does.
 */
const DARK_LINE_ALPHA = {
  border: 0.085,
  borderStrong: 0.14,
  chip: 0.065,
  gridLine: 0.055,
} as const
const ACCENT_TINT_ALPHA_BOOST = 1.8

/** Text and muted targets, measured as contrast against `panel`. */
const TEXT_CONTRAST = { light: 8.5, dark: 13 } as const
const MUTED_CONTRAST = { light: 2.3, dark: 5 } as const
const TEXT_SEED = { light: { l: 0.43, c: 0.42 }, dark: { l: 0.94, c: 0.18 } } as const
const MUTED_SEED = { light: { l: 0.77, c: 0.43 }, dark: { l: 0.66, c: 0.4 } } as const

/**
 * `Sidebar` hardcodes white text, so the mid stop of `sideGrad` is the one token
 * with a hard legibility floor. The shipped light presets land between 1.38:1
 * (`lemon` — white on pale yellow, effectively unreadable) and 4.59:1, with a
 * median of 2.27:1. Targeting 2.4:1 fixes the broken tail without darkening the
 * typical pastel sidebar.
 */
export const SIDEBAR_MIN_WHITE_CONTRAST = 2.4

/**
 * `sidebarDepth` runs 0..1 and only ever darkens — a two-directional control
 * would have a dead half.
 *
 * `SIDEBAR_L` is the *lightest* value worth offering, because the 2.4:1 guard
 * above is a hard ceiling: the four presets authored lighter than this
 * (`peach` 0.813, `sakura` 0.839, `lemon` 0.893) all get pulled back to
 * 0.727–0.741 by it, so every "lighter" setting would render identically. The
 * ranges then cover the real span of the presets below the ceiling (light
 * 0.563–0.749, dark 0.218–0.288) with headroom to go darker than any of them.
 */
export const SIDEBAR_L = { light: 0.75, dark: 0.29 } as const
export const SIDEBAR_C_RATIO = { light: 0.85, dark: 0.42 } as const
export const SIDEBAR_DEPTH_RANGE = { light: 0.3, dark: 0.14 } as const

/** Cream hue for the `warm` paper style. */
export const WARM_HUE = 75

/** Above any chroma measured in a shipped preset; purely a runaway guard. */
const SURFACE_CHROMA_CAP = 0.11

const PAPER_PANEL = {
  pure: { l: 1, c: 0 },
  tinted: { l: 0.995, c: 0.05 },
  warm: { l: 0.993, c: 0.03 },
} as const

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/**
 * Builds the twenty design tokens from the guided inputs, then lets `overrides`
 * win. Overrides are applied last so the Advanced section always beats a derived
 * value, and readability correction runs *before* them — a user who deliberately
 * types an unreadable colour gets a warning, not a silent rewrite.
 */
export function buildTokensFromRecipe(recipe: ThemeRecipe): ThemeTokens {
  const dark = recipe.mode === 'dark'
  const accent = normalizeHex(recipe.accent, '#8b7be8')
  const secondary = normalizeHex(recipe.secondary, accent)
  const highlight = normalizeHex(recipe.highlight, accent)

  const a = hexToOklch(accent)
  // 0.5 maps to 1.0 so the midpoint of the slider reproduces the measured means.
  const k = clamp(recipe.intensity, 0, 1) + 0.5
  const surfaceHue = recipe.paper === 'warm' ? WARM_HUE : a.h

  const surface = ({ l, c }: SurfaceSpec, hue = surfaceHue): string =>
    oklchToHex({ l, c: Math.min(a.c * c * k, SURFACE_CHROMA_CAP), h: hue })

  const panelSpec = PAPER_PANEL[recipe.paper]
  const panel = dark ? surface(DARK_SURFACES.panel) : surface(panelSpec)

  // --- text + muted, corrected against the panel they sit on ----------------
  const textSeed = TEXT_SEED[dark ? 'dark' : 'light']
  const mutedSeed = MUTED_SEED[dark ? 'dark' : 'light']
  const text = solveLightnessForContrast(
    oklchToHex({ l: textSeed.l, c: Math.min(a.c * textSeed.c * k, 0.09), h: a.h }),
    panel,
    TEXT_CONTRAST[dark ? 'dark' : 'light'],
    dark ? 'lighter' : 'darker',
  )
  const muted = solveLightnessForContrast(
    oklchToHex({ l: mutedSeed.l, c: Math.min(a.c * mutedSeed.c * k, 0.1), h: a.h }),
    panel,
    MUTED_CONTRAST[dark ? 'dark' : 'light'],
    dark ? 'lighter' : 'darker',
  )

  // --- sidebar gradient ------------------------------------------------------
  const depthRange = SIDEBAR_DEPTH_RANGE[dark ? 'dark' : 'light']
  const sideL = clamp(
    SIDEBAR_L[dark ? 'dark' : 'light'] - clamp(recipe.sidebarDepth, 0, 1) * depthRange,
    0.08,
    0.95,
  )
  const sideMidRaw = oklchToHex({
    l: sideL,
    c: Math.min(a.c * SIDEBAR_C_RATIO[dark ? 'dark' : 'light'] * k, a.c),
    h: a.h,
  })
  const sideMid = withWhiteContrastAtLeast(sideMidRaw, SIDEBAR_MIN_WHITE_CONTRAST)
  const sideTop = shiftHue(lighten(sideMid, dark ? 0.04 : 0.07), 6)
  // mixOklch, not mixHex: a Cartesian OKLab blend between two far-apart hues
  // passes through the neutral axis and the tail stop would go grey.
  const sideBottom = lighten(mixOklch(sideMid, secondary, 0.45), dark ? 0.045 : 0.035)

  // --- line tokens -----------------------------------------------------------
  const tint = recipe.lineTint ?? 'white'
  const lineBase = tint === 'accent' ? accent : '#ffffff'
  const lineBoost = tint === 'accent' ? ACCENT_TINT_ALPHA_BOOST : 1
  const darkLine = (key: keyof typeof DARK_LINE_ALPHA) =>
    rgba(lineBase, Math.round(DARK_LINE_ALPHA[key] * lineBoost * k * 1000) / 1000)

  const secondaryHue = hexToOklch(secondary).h
  const secondaryTint = (spec: SurfaceSpec) =>
    oklchToHex({
      l: spec.l,
      c: Math.min(hexToOklch(secondary).c * spec.c * k, SURFACE_CHROMA_CAP),
      h: recipe.paper === 'warm' ? WARM_HUE : secondaryHue,
    })

  const appBgSpec = dark ? DARK_SURFACES.appBg : LIGHT_SURFACES.appBg

  return {
    accent,
    grad: `linear-gradient(135deg,${lighten(accent, 0.035)},${secondary})`,
    appBg: `linear-gradient(160deg,${surface(appBgSpec)},${secondaryTint(appBgSpec)})`,
    mainBg: dark ? surface(DARK_SURFACES.mainBg) : surface(LIGHT_SURFACES.mainBg),
    panel,
    modalBg: panel,
    inputBg: dark ? surface(DARK_SURFACES.inputBg) : surface(LIGHT_SURFACES.inputBg),
    text,
    muted,
    border: dark ? darkLine('border') : surface(LIGHT_SURFACES.border),
    borderStrong: dark ? darkLine('borderStrong') : surface(LIGHT_SURFACES.borderStrong),
    chip: dark ? darkLine('chip') : surface(LIGHT_SURFACES.chip),
    gridLine: dark ? darkLine('gridLine') : surface(LIGHT_SURFACES.gridLine),
    nowLine: highlight,
    dark,
    sideGrad: `linear-gradient(175deg,${sideTop},${sideMid} 58%,${sideBottom})`,
    decor: recipe.decor.length ? recipe.decor : ['star'],
    decorColors: recipe.decorColors.length
      ? recipe.decorColors.map((c) => normalizeHex(c, accent))
      : defaultDecorColors(accent, secondary, highlight, dark),
  }
}

/**
 * The cream `#fff0b8` is not arbitrary — that literal appears in lavender, mint,
 * grape and cottoncandy, and near-identically in ocean and lemon. It is the
 * palette family's signature highlight.
 */
export function defaultDecorColors(
  accent: Hex,
  secondary: Hex,
  highlight: Hex,
  dark: boolean,
): Hex[] {
  if (dark) return [accent, lighten(accent, 0.15), highlight, shiftHue(accent, 30)]
  const pale = (hex: string) => {
    const { c, h } = hexToOklch(hex)
    return oklchToHex({ l: 0.9, c: Math.min(c * 0.55, 0.09), h })
  }
  return [pale(accent), pale(secondary), '#fff0b8', pale(shiftHue(accent, 20))]
}

/** Full definition for a user-authored theme: derived tokens, then overrides. */
export function buildThemeFromRecipe(
  recipe: ThemeRecipe,
  identity: { key: ThemeId; name: ThemeDefinition['name']; icon: string },
  overrides: TokenOverrides = {},
  art?: ThemeDefinition['art'],
): ThemeDefinition {
  return {
    ...identity,
    ...buildTokensFromRecipe(recipe),
    ...overrides,
    ...(art ? { art } : {}),
  }
}
