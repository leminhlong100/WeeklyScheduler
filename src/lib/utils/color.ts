interface Rgb {
  r: number
  g: number
  b: number
}

/** `l` 0..1, `c` 0..~0.4, `h` 0..360. */
export interface Oklch {
  l: number
  c: number
  h: number
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Parses `#rgb`, `#rrggbb` or `#rrggbbaa` (alpha dropped), with or without the
 * leading `#`. Falls back to black rather than producing `NaN` channels: a
 * malformed value used to yield `rgba(NaN, NaN, NaN, a)`, which the CSS parser
 * discards silently — so a single bad color could drop four of `pageBg`'s five
 * gradient layers with no error anywhere.
 */
function hexToRgb(hex: string): Rgb {
  const match = HEX_RE.exec(hex.trim())
  if (!match) return { r: 0, g: 0, b: 0 }

  let body = match[1]
  if (body.length === 3) body = body[0] + body[0] + body[1] + body[1] + body[2] + body[2]

  const n = parseInt(body.slice(0, 6), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** True for `#rgb`, `#rrggbb` or `#rrggbbaa`, with or without the `#`. */
export function isHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

/** Any accepted hex form -> `#rrggbb`. Invalid input returns `fallback`. */
export function normalizeHex(value: string, fallback = '#000000'): string {
  return isHex(value) ? rgbToHex(hexToRgb(value)) : fallback
}

/** `#rrggbb` + alpha -> `rgba(r, g, b, a)`. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Linear-interpolate between two hex colors in sRGB, `t` in [0, 1].
 * Returns a `rgb()` string. New code that needs a hex result should use
 * {@link mixSrgbHex}, or {@link mixHex} for perceptually even blending.
 */
export function mixColors(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

/** {@link mixColors} with a `#rrggbb` result. */
export function mixSrgbHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  })
}

// ---------------------------------------------------------------------------
// OKLab / OKLCH
//
// Theme palettes are authored to perceived lightness, not channel ratios — the
// shipped presets only line up with each other once expressed as an absolute
// OKLCH lightness plus a chroma scale relative to the accent. Naive sRGB mixing
// also turns cross-hue blends into grey mud, which the sidebar gradient needs to
// avoid. Matrices are Björn Ottosson's; kept inline so this module stays
// dependency-free, since `deriveTheme` runs on every theme change.
// ---------------------------------------------------------------------------

function srgbToLinear(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(v: number): number {
  // Negative input means out of gamut. Mirror the curve rather than letting
  // Math.pow return NaN, so the gamut check below sees a real out-of-range
  // number it can bisect against.
  const sign = v < 0 ? -1 : 1
  const a = Math.abs(v)
  const c = a <= 0.0031308 ? a * 12.92 : 1.055 * Math.pow(a, 1 / 2.4) - 0.055
  return sign * c * 255
}

function rgbToOklab(rgb: Rgb): { L: number; a: number; b: number } {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

function oklabToRgb(lab: { L: number; a: number; b: number }): Rgb {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

function isInGamut({ r, g, b }: Rgb): boolean {
  const ok = (v: number) => v >= -0.5 && v <= 255.5
  return ok(r) && ok(g) && ok(b)
}

export function hexToOklch(hex: string): Oklch {
  const { L, a, b } = rgbToOklab(hexToRgb(hex))
  const c = Math.sqrt(a * a + b * b)
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

/**
 * OKLCH -> `#rrggbb`. Out-of-gamut values are mapped by bisecting chroma down
 * until the sRGB triple fits, never by clipping channels — clipping shifts hue,
 * which turns a saturated accent into a different color family.
 */
export function oklchToHex({ l, c, h }: Oklch): string {
  const L = clamp(l, 0, 1)
  const rad = (h * Math.PI) / 180
  const at = (chroma: number) =>
    oklabToRgb({ L, a: Math.cos(rad) * chroma, b: Math.sin(rad) * chroma })

  const full = at(Math.max(c, 0))
  if (isInGamut(full)) return rgbToHex(full)

  let lo = 0
  let hi = Math.max(c, 0)
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (isInGamut(at(mid))) lo = mid
    else hi = mid
  }
  return rgbToHex(at(lo))
}

// ---------------------------------------------------------------------------
// Manipulation — every function returns `#rrggbb`
// ---------------------------------------------------------------------------

export function withLightness(hex: string, l: number): string {
  return oklchToHex({ ...hexToOklch(hex), l })
}

export function withChroma(hex: string, c: number): string {
  return oklchToHex({ ...hexToOklch(hex), c })
}

export function withHue(hex: string, h: number): string {
  return oklchToHex({ ...hexToOklch(hex), h })
}

export function shiftHue(hex: string, deltaDeg: number): string {
  const { l, c, h } = hexToOklch(hex)
  return oklchToHex({ l, c, h: (((h + deltaDeg) % 360) + 360) % 360 })
}

export function scaleChroma(hex: string, factor: number, cap = Infinity): string {
  const { l, c, h } = hexToOklch(hex)
  return oklchToHex({ l, c: Math.min(c * factor, cap), h })
}

/** Raises OKLCH lightness by `amount`, clamped to [0, 1]. */
export function lighten(hex: string, amount: number): string {
  const { l, c, h } = hexToOklch(hex)
  return oklchToHex({ l: clamp(l + amount, 0, 1), c, h })
}

export function darken(hex: string, amount: number): string {
  return lighten(hex, -amount)
}

/**
 * Perceptually even blend through OKLab, interpolating the `a`/`b` axes.
 *
 * Because that path is a straight line in a Cartesian plane, blending two
 * near-complementary hues passes close to the neutral axis and the midpoint
 * goes grey — mint to pink lands on `#a0a4aa`. That is the right behaviour when
 * tinting a color *toward a surface*, and the wrong one when blending two
 * accents; use {@link mixOklch} for the latter.
 */
export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = rgbToOklab(hexToRgb(hexA))
  const b = rgbToOklab(hexToRgb(hexB))
  return rgbToHex(
    oklabToRgb({
      L: a.L + (b.L - a.L) * t,
      a: a.a + (b.a - a.a) * t,
      b: a.b + (b.b - a.b) * t,
    }),
  )
}

/**
 * Blends in polar OKLCH, taking the shorter way around the hue circle, so
 * chroma survives the trip. This is the one to use for palettes — a gradient
 * from one accent to another stays saturated the whole way instead of dipping
 * through grey at the midpoint.
 */
export function mixOklch(hexA: string, hexB: string, t: number): string {
  const a = hexToOklch(hexA)
  const b = hexToOklch(hexB)

  // A greyscale endpoint has no meaningful hue; keep the other end's so the
  // blend fades in chroma rather than swinging toward hue 0 (red).
  const hueA = a.c < 1e-4 ? b.h : a.h
  const hueB = b.c < 1e-4 ? a.h : b.h

  let delta = hueB - hueA
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360

  return oklchToHex({
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: (((hueA + delta * t) % 360) + 360) % 360,
  })
}

/** Composites `fg` at `alpha` over opaque `bg`. Useful for previewing `rgba()` tokens. */
export function flattenAlpha(fg: string, alpha: number, bg: string): string {
  return mixSrgbHex(bg, fg, clamp(alpha, 0, 1))
}

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

/** WCAG 2.1 relative luminance, 0..1. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Picks whichever of `light`/`dark` reads better on `bg`. */
export function readableTextOn(
  bg: string,
  options: { light?: string; dark?: string } = {},
): string {
  const light = options.light ?? '#ffffff'
  const dark = options.dark ?? '#1c1c28'
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark
}

/**
 * Bisects OKLCH lightness toward the nearest value satisfying `test`, keeping
 * hue and chroma. `goDarker` searches below the starting lightness, otherwise
 * above. Converges on the *smallest* change that passes.
 */
function solveLuminance(hex: string, test: (y: number) => boolean, goDarker: boolean): string {
  if (test(relativeLuminance(hex))) return normalizeHex(hex)

  const { l, c, h } = hexToOklch(hex)
  let lo = goDarker ? 0 : l
  let hi = goDarker ? l : 1

  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (test(relativeLuminance(oklchToHex({ l: mid, c, h })))) {
      if (goDarker) lo = mid
      else hi = mid
    } else if (goDarker) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return oklchToHex({ l: goDarker ? lo : hi, c, h })
}

/** Darkens (hue and chroma preserved) until relative luminance is at most `maxY`. */
export function withLuminanceAtMost(hex: string, maxY: number): string {
  return solveLuminance(hex, (y) => y <= maxY, true)
}

/** Lightens (hue and chroma preserved) until relative luminance is at least `minY`. */
export function withLuminanceAtLeast(hex: string, minY: number): string {
  return solveLuminance(hex, (y) => y >= minY, false)
}

/**
 * Darkens `hex` until white text on it reaches `target` contrast.
 *
 * The sidebar hardcodes white text, so this is the guard that stops a
 * user-chosen gradient from making it unreadable. Expressed as a contrast
 * target rather than a luminance cap because the two are easy to confuse:
 * `contrast(white, bg) = 1.05 / (Y + 0.05)`, so capping Y at 0.42 pins the
 * ratio at exactly 2.23:1 — no more, no less.
 */
export function withWhiteContrastAtLeast(hex: string, target: number): string {
  return withLuminanceAtMost(hex, 1.05 / target - 0.05)
}

/**
 * Moves `hex`'s OKLCH lightness — hue and chroma untouched — until it reaches
 * `target` contrast against `bg`. `'auto'` picks whichever direction has
 * headroom. Returns the closest achievable value if `target` is out of reach,
 * so a caller always gets a usable color rather than an error.
 */
export function solveLightnessForContrast(
  hex: string,
  bg: string,
  target: number,
  direction: 'darker' | 'lighter' | 'auto' = 'auto',
): string {
  const start = normalizeHex(hex)
  if (contrastRatio(start, bg) >= target) return start

  const { l: startL, c, h } = hexToOklch(start)
  const at = (l: number) => oklchToHex({ l, c, h })

  /**
   * Bisects between the extreme (which passes, if the target is reachable at
   * all) and the starting lightness (which does not), converging on the
   * *smallest* change that still meets `target`. Returning the highest-contrast
   * candidate instead would drag every corrected color to near-black.
   */
  const attempt = (goDarker: boolean) => {
    const extreme = goDarker ? 0 : 1
    const extremeHex = at(extreme)
    if (contrastRatio(extremeHex, bg) < target) {
      return { hex: extremeHex, delta: Infinity, ratio: contrastRatio(extremeHex, bg) }
    }

    let pass = extreme
    let fail = startL
    for (let i = 0; i < 20; i++) {
      const mid = (pass + fail) / 2
      if (contrastRatio(at(mid), bg) >= target) pass = mid
      else fail = mid
    }
    return { hex: at(pass), delta: Math.abs(pass - startL), ratio: contrastRatio(at(pass), bg) }
  }

  if (direction === 'darker') return attempt(true).hex
  if (direction === 'lighter') return attempt(false).hex

  const darker = attempt(true)
  const lighter = attempt(false)
  // Both reachable: take the smaller lightness move. Neither: take the closest.
  if (darker.delta === Infinity && lighter.delta === Infinity) {
    return darker.ratio >= lighter.ratio ? darker.hex : lighter.hex
  }
  return darker.delta <= lighter.delta ? darker.hex : lighter.hex
}
