import { contrastRatio, isHex, mixSrgbHex, normalizeHex } from '@/lib/utils/color'
import type { ThemeArt, ThemeTokens } from '../types'

/**
 * Readability checks on a finished token set.
 *
 * The thresholds are measured against the shipped presets, not lifted from WCAG
 * wholesale. That is a deliberate call: the existing palettes violate AA on two
 * of the five pairs checked here (`muted` on `panel` is 1.98:1 in `mint`, and
 * white on `lemon`'s sidebar is 1.38:1), so a blanket AA gate would declare
 * fourteen of sixteen shipped themes invalid and make pastel themes unbuildable.
 *
 * So the split is: **block** only what makes text genuinely unreadable, **warn**
 * on everything the app itself already ships. Blocking more than the app honours
 * would be lying about its own standard.
 *
 * The engine already auto-corrects `text`, `muted` and the sidebar mid stop, so
 * anything reported here came from the Advanced section — a value the user typed
 * on purpose, which earns a warning rather than a silent rewrite.
 */

export const CONTRAST_LIMITS = {
  /** Below this, body text on a surface is not readable. Blocks saving. */
  textFloor: 4.5,
  /** `mint` ships 1.98:1, so warning starts just under it. */
  mutedWarn: 2,
  /** White sidebar text; `lemon` ships 1.38:1 and is the reason this exists. */
  sidebarWarn: 1.8,
  /** Text over the composited scene. */
  sceneWarn: 4.5,
} as const

export type ThemeIssueSeverity = 'error' | 'warn'

export interface ThemeIssue {
  /** Dictionary key; the panel renders it directly. */
  code: string
  severity: ThemeIssueSeverity
  ratio: number
  /** Which token to focus when the user taps the issue. */
  token?: keyof ThemeTokens
  /** For scene issues: the highest opacity that would pass, as a fraction. */
  suggestedOpacity?: number
}

const RGB_FN = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/gi
const HEX_GLOBAL = /#[0-9a-fA-F]{6}\b/g

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/**
 * Every colour a token can actually paint, flattened to opaque hex.
 *
 * A token is not one colour: dark themes use `rgba()` over the surface below,
 * and `panel`/`sideGrad` can be multi-stop gradients. Returning all candidates
 * lets the caller check the *worst* of them, which is the only honest reading —
 * text that passes against a gradient's light stop can still be illegible over
 * its dark one.
 */
export function resolveTokenColors(value: string, base: string): string[] {
  if (isHex(value)) return [normalizeHex(value)]

  const out: string[] = []
  for (const m of value.matchAll(RGB_FN)) {
    const rgbHex = toHex(Number(m[1]), Number(m[2]), Number(m[3]))
    const rawAlpha = m[4]
    const alpha = rawAlpha
      ? rawAlpha.endsWith('%')
        ? Number(rawAlpha.slice(0, -1)) / 100
        : Number(rawAlpha)
      : 1
    out.push(mixSrgbHex(base, rgbHex, Number.isFinite(alpha) ? alpha : 1))
  }
  for (const hex of value.match(HEX_GLOBAL) ?? []) out.push(hex.toLowerCase())

  return out.length > 0 ? out : [normalizeHex(base)]
}

/** Worst contrast of `fg` against any colour `token` can paint. */
export function worstContrast(fg: string, token: string, base: string): number {
  const candidates = resolveTokenColors(token, base)
  return candidates.reduce((worst, hex) => Math.min(worst, contrastRatio(fg, hex)), Infinity)
}

/** The mid stop of `sideGrad`, or its only colour. */
function sidebarMid(sideGrad: string): string | null {
  const stops = sideGrad.match(HEX_GLOBAL)?.map((h) => h.toLowerCase())
  if (!stops?.length) return null
  return stops[1] ?? stops[0]
}

/**
 * Scene art is painted as an `opacity` layer directly on `mainBg` with nothing
 * between (`ThemeArtLayer.tsx:38-46`), so an sRGB mix of the two *is* what the
 * compositor produces — no approximation.
 */
function compositeScene(mainBg: string, cell: string, opacity: number): string {
  return mixSrgbHex(mainBg, cell, opacity)
}

/** Largest opacity, in 1% steps, at which text still clears the threshold. */
function maxPassingOpacity(text: string, mainBg: string, cell: string, target: number): number {
  for (let pct = 100; pct >= 0; pct -= 1) {
    if (contrastRatio(text, compositeScene(mainBg, cell, pct / 100)) >= target) return pct / 100
  }
  return 0
}

export function validateTheme(tokens: ThemeTokens, art?: ThemeArt | null): ThemeIssue[] {
  const issues: ThemeIssue[] = []
  const { text, muted, dark } = tokens
  const fallbackBase = dark ? '#12132a' : '#ffffff'

  // --- text on every surface it can land on ---------------------------------
  const surfaces: { token: keyof ThemeTokens; value: string }[] = [
    { token: 'panel', value: tokens.panel },
    { token: 'modalBg', value: tokens.modalBg },
    { token: 'mainBg', value: tokens.mainBg },
    { token: 'inputBg', value: tokens.inputBg },
    { token: 'appBg', value: tokens.appBg },
    { token: 'chip', value: tokens.chip },
  ]
  for (const { token, value } of surfaces) {
    const base = token === 'chip' ? resolveTokenColors(tokens.panel, fallbackBase)[0] : fallbackBase
    const ratio = worstContrast(text, value, base)
    if (ratio < CONTRAST_LIMITS.textFloor) {
      issues.push({ code: 'themeIssueTextSurface', severity: 'error', ratio, token })
    }
  }

  // --- muted on the panel ---------------------------------------------------
  const mutedRatio = worstContrast(muted, tokens.panel, fallbackBase)
  if (mutedRatio < CONTRAST_LIMITS.mutedWarn) {
    issues.push({ code: 'themeIssueMuted', severity: 'warn', ratio: mutedRatio, token: 'muted' })
  }

  // --- white sidebar text ---------------------------------------------------
  // `Sidebar.tsx` hard-codes `text-white` and literal `rgba(255,255,255,…)`, so
  // this pair cannot be fixed by any token; only the gradient can move.
  const mid = sidebarMid(tokens.sideGrad)
  if (mid) {
    const ratio = contrastRatio('#ffffff', mid)
    if (ratio < CONTRAST_LIMITS.sidebarWarn) {
      issues.push({ code: 'themeIssueSidebar', severity: 'warn', ratio, token: 'sideGrad' })
    }
  }

  // --- text over the scene artwork -----------------------------------------
  // Worst case is the darkest scene cell under dark text, the lightest under
  // light text — the cell that pulls the composite *toward* the text colour.
  const cell = dark ? art?.sceneLightestCell : art?.sceneDarkestCell
  if (art?.scene && cell) {
    const opacity = art.sceneOpacity ?? 0.42
    const mainBg = resolveTokenColors(tokens.mainBg, fallbackBase)[0]
    const ratio = contrastRatio(text, compositeScene(mainBg, cell, opacity))
    if (ratio < CONTRAST_LIMITS.sceneWarn) {
      issues.push({
        code: 'themeIssueScene',
        severity: 'warn',
        ratio,
        suggestedOpacity: maxPassingOpacity(text, mainBg, cell, CONTRAST_LIMITS.sceneWarn),
      })
    }
  }

  return issues
}

/** Saving is blocked only by `error` issues. */
export function hasBlockingIssue(issues: ThemeIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}
