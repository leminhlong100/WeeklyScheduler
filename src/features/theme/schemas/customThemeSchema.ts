import { z } from 'zod'
import { DECOR_SHAPES } from '@/lib/utils/svgShapes'
import { ART_PREFIX, MAX_FIGURES, SCENE_POSITIONS } from '../art/constants'
import { THEME_KEYS, type ThemeKey } from '../types'

/**
 * Validation for every value that crosses into the theme renderer.
 *
 * Two different colour grammars on purpose, because the tokens are not
 * interchangeable:
 *
 * `hexColor` — strict `#rrggbb`. Required for `accent` and every entry of
 * `decorColors`, and *only* those, because they are the only tokens that reach
 * `parseInt` inside `rgba()` (`deriveTheme.ts:12-16,23,26`). A non-hex value
 * there yields `rgba(NaN,NaN,NaN,a)`, which the CSS parser drops silently —
 * `pageBg` would quietly lose four of its five gradient layers.
 *
 * `cssPaint` — a restricted CSS value. The other eighteen tokens legitimately
 * hold `rgba()` and multi-stop gradients (every dark preset does), so a hex-only
 * rule would make dark themes unbuildable. Instead: character allowlist, banned
 * function names, and balanced parentheses.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export const hexColor = z
  .string()
  .trim()
  .regex(HEX_RE, 'themeErrHex')
  .transform((v) => v.toLowerCase())

/**
 * Characters legal in the colour/gradient values we support. Notably absent:
 * `;` `{` `}` (declaration and rule breakers), quotes, backslash, and `<` `>`.
 */
const CSS_PAINT_ALLOWED = /^[a-zA-Z0-9\s#%.,()/*+\-_]*$/

/**
 * Functions that either fetch (`url`, `image-set`, `cross-fade`), read outside
 * the declaration (`var`, `env`, `attr`, `counter`, `element`), or are a legacy
 * script vector (`expression`). Everything the builder emits —
 * `linear-gradient`, `radial-gradient`, `repeating-*`, `rgba`, `hsl`, `oklch`,
 * `color-mix`, `calc` — survives.
 */
const CSS_PAINT_BANNED = /url|var\s*\(|image-set|cross-fade|element\s*\(|expression|attr\s*\(|counter|env\s*\(|@|\/\*/i

function parensBalanced(value: string): boolean {
  let depth = 0
  for (const ch of value) {
    if (ch === '(') depth++
    else if (ch === ')' && --depth < 0) return false
  }
  return depth === 0
}

export const cssPaint = z
  .string()
  .trim()
  .min(1, 'fieldRequired')
  .max(400, 'themeErrTooLong')
  .refine((v) => CSS_PAINT_ALLOWED.test(v), 'themeErrCssChars')
  .refine((v) => !CSS_PAINT_BANNED.test(v), 'themeErrCssFunc')
  .refine(parensBalanced, 'themeErrCssParens')

/**
 * An art URL. Must live in our own public bucket — see `ART_PREFIX`. The second
 * check rejects the characters that could still break the `url("…")` token even
 * after the prefix matches, so `cssUrl()` at the sink is defence in depth rather
 * than the only line.
 */
export const artUrl = z
  .string()
  .trim()
  .max(500, 'themeErrTooLong')
  .refine((v) => v.startsWith(ART_PREFIX), 'themeErrArtOrigin')
  .refine((v) => !/["'()\\<>\s]/.test(v), 'themeErrArtChars')

const unitInterval = z.number().min(0).max(1)

export const themeArtFigureSchema = z.object({
  src: artUrl,
  /** A percentage; the figure is centred on it. */
  x: z
    .string()
    .trim()
    .regex(/^-?\d{1,3}(\.\d+)?%$/, 'themeErrPercent'),
  h: z.number().min(40).max(600),
  flip: z.boolean().optional(),
  opacity: unitInterval.optional(),
})

export const themeArtSchema = z.object({
  scene: artUrl.optional(),
  sideScene: artUrl.optional(),
  scenePosition: z.enum(SCENE_POSITIONS).optional(),
  sceneOpacity: unitInterval.optional(),
  figures: z.array(themeArtFigureSchema).max(MAX_FIGURES).optional(),
  sceneDarkestCell: hexColor.optional(),
  sceneLightestCell: hexColor.optional(),
})

/** `THEME_KEYS` is declared as an array, so the tuple shape `z.enum` wants has
 * to be asserted; the element type is still `ThemeKey`, so the output type is
 * exact and a key added to the list is picked up here for free. */
const themeKeySchema = z.enum(THEME_KEYS as unknown as readonly [ThemeKey, ...ThemeKey[]])

export const themeRecipeSchema = z.object({
  basePreset: themeKeySchema.catch('lavender'),
  mode: z.enum(['light', 'dark']),
  accent: hexColor,
  secondary: hexColor,
  highlight: hexColor,
  paper: z.enum(['pure', 'tinted', 'warm']),
  intensity: unitInterval,
  sidebarDepth: unitInterval,
  lineTint: z.enum(['white', 'accent']).optional(),
  /**
   * `min(1)` on both is load-bearing, not defensive:
   * `DecorBackground.tsx:53-54` indexes with `arr[i % arr.length]`, and `i % 0`
   * is `NaN` — an empty array renders `undefined` colours, not zero decorations.
   */
  decor: z.array(z.enum(DECOR_SHAPES)).min(1, 'themeErrNeedDecor').max(6),
  decorColors: z.array(hexColor).min(1, 'themeErrNeedColor').max(4),
})

/**
 * The Advanced section's sparse patch. Every key optional, and the two
 * `parseInt`-bound tokens keep the strict hex rule they have in the recipe.
 */
export const tokenOverridesSchema = z.object({
  accent: hexColor.optional(),
  grad: cssPaint.optional(),
  appBg: cssPaint.optional(),
  mainBg: cssPaint.optional(),
  panel: cssPaint.optional(),
  text: cssPaint.optional(),
  muted: cssPaint.optional(),
  border: cssPaint.optional(),
  borderStrong: cssPaint.optional(),
  chip: cssPaint.optional(),
  inputBg: cssPaint.optional(),
  modalBg: cssPaint.optional(),
  gridLine: cssPaint.optional(),
  nowLine: cssPaint.optional(),
  dark: z.boolean().optional(),
  sideGrad: cssPaint.optional(),
  decor: z.array(z.enum(DECOR_SHAPES)).min(1).max(6).optional(),
  decorColors: z.array(hexColor).min(1).max(4).optional(),
})

/**
 * Keeps the fields of `shape` that validate and silently drops the rest.
 *
 * Used for the two parts of a stored theme that are *decoration* rather than
 * structure. Failing the whole row on one bad value would mean a single stale
 * `#abc` in the Advanced section, or one art URL left over from a renamed
 * bucket, deletes a theme the user spent real time on — while the other
 * nineteen tokens were perfectly fine.
 *
 * The recipe gets no such treatment: it is the theme.
 */
function lenient<S extends z.ZodObject<z.ZodRawShape>>(schema: S) {
  return z.preprocess((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const source = value as Record<string, unknown>
    const kept: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(schema.shape) as [string, z.ZodType][]) {
      if (!(key in source) || source[key] === undefined) continue
      const result = field.safeParse(source[key])
      if (result.success) kept[key] = result.data
    }
    return kept
  }, schema)
}

/** Row-read variant of the overrides patch: drops bad keys, keeps the theme. */
export const storedTokenOverridesSchema = lenient(tokenOverridesSchema)

/**
 * Row-read variant of the art block. Figures are filtered individually so a
 * third character with a stale URL doesn't take the scene down with it.
 */
export const storedThemeArtSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  const figures = Array.isArray(source.figures)
    ? source.figures.filter((figure) => themeArtFigureSchema.safeParse(figure).success)
    : undefined
  return { ...source, ...(figures ? { figures } : { figures: undefined }) }
}, lenient(themeArtSchema))

export const themeNameSchema = z.string().trim().min(1, 'fieldRequired').max(40)
export const themeIconSchema = z.string().trim().min(1, 'fieldRequired').max(16)

/**
 * A row as it comes back from Postgres. `recipe`/`overrides`/`art` are `unknown`
 * at the boundary — the DB columns are `jsonb` and nothing upstream guarantees
 * their shape, least of all a row written by an older build of this client.
 */
export const customThemeRowSchema = z.object({
  id: z.string().min(1),
  name: themeNameSchema,
  icon: themeIconSchema,
  recipe: themeRecipeSchema,
  overrides: storedTokenOverridesSchema.default({}),
  art: storedThemeArtSchema.nullish().catch(null),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

/**
 * The final gate: the *merged* token object, which is the only thing
 * `deriveTheme` actually consumes. Validating the recipe and the overrides
 * separately is not enough — an override can put an invalid value onto a token
 * the recipe never named.
 */
export const themeTokensSchema = z.object({
  accent: hexColor,
  grad: cssPaint,
  appBg: cssPaint,
  mainBg: cssPaint,
  panel: cssPaint,
  text: cssPaint,
  muted: cssPaint,
  border: cssPaint,
  borderStrong: cssPaint,
  chip: cssPaint,
  inputBg: cssPaint,
  modalBg: cssPaint,
  gridLine: cssPaint,
  nowLine: cssPaint,
  dark: z.boolean(),
  sideGrad: cssPaint,
  decor: z.array(z.enum(DECOR_SHAPES)).min(1).max(6),
  decorColors: z.array(hexColor).min(1).max(4),
})
