import { describe, expect, it } from 'vitest'
import { contrastRatio, flattenAlpha, hexToOklch } from '@/lib/utils/color'
import { deriveTheme } from '../deriveTheme'
import { themeRecipeSchema } from '../schemas/customThemeSchema'
import { getThemeDefinition, listThemeDefinitions } from '../themes'
import { THEME_KEYS } from '../types'
import { buildTokensFromRecipe } from './buildTheme'
import { recipeFromDefinition } from './recipeFromDefinition'
import type { ThemeRecipe } from './types'
import { validateTheme } from './validate'

const stops = (css: string) => css.match(/#[0-9a-fA-F]{6}\b/g) ?? []
const mid = (css: string) => stops(css)[1] ?? stops(css)[0]
const AA = 4.45

/** Một recipe đã lưu trước khi có `v` — đúng hình dạng đang nằm trên Supabase. */
const LEGACY: ThemeRecipe = {
  basePreset: 'lemon',
  mode: 'light',
  accent: '#e0b400',
  secondary: '#ffb547',
  highlight: '#ff7aa8',
  paper: 'pure',
  intensity: 0.8,
  sidebarDepth: 0,
  lineTint: 'white',
  decor: ['star'],
  decorColors: ['#fff0b8'],
}

describe('sidebar recipe v2', () => {
  it('keeps legacy recipes (no `v`) rendering exactly as before: clamped for white text', () => {
    const tokens = buildTokensFromRecipe(LEGACY)
    // Kẹp cũ: chữ trắng trên điểm giữa ≥ 2.4:1.
    expect(contrastRatio('#ffffff', mid(tokens.sideGrad))).toBeGreaterThanOrEqual(2.39)
  })

  it('schema keeps `v` and still accepts recipes without it', () => {
    const parsedNew = themeRecipeSchema.parse({ ...LEGACY, v: 2 })
    expect(parsedNew.v).toBe(2)
    const parsedOld = themeRecipeSchema.parse(LEGACY)
    expect(parsedOld.v).toBeUndefined()
  })

  it.each(['lemon', 'peach', 'sakura'] as const)(
    'starting from pale preset %s keeps its pale sidebar',
    (key) => {
      const def = getThemeDefinition(key)
      const recipe = recipeFromDefinition(def, key)
      expect(recipe.v).toBe(2)
      const built = buildTokensFromRecipe(recipe)
      const want = hexToOklch(mid(def.sideGrad)).l
      const got = hexToOklch(mid(built.sideGrad)).l
      expect(Math.abs(got - want)).toBeLessThan(0.03)
    },
  )

  it.each(THEME_KEYS)('%s rebuilt at both sidebar extremes keeps sidebar text ≥ 4.5:1', (key) => {
    const def = getThemeDefinition(key)
    for (const sidebarDepth of [0, 1]) {
      const recipe = { ...recipeFromDefinition(def, key), sidebarDepth }
      const theme = deriveTheme({ ...def, ...buildTokensFromRecipe(recipe) })
      const side = stops(theme.sideGrad)
      const bgs = [...side, ...side.map((s) => flattenAlpha('#ffffff', 0.22, s))]
      for (const bg of bgs) expect(contrastRatio(theme.sidebarText, bg)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('no preset rebuild raises a readability issue', () => {
    for (const def of listThemeDefinitions()) {
      const key = def.key as (typeof THEME_KEYS)[number]
      const tokens = buildTokensFromRecipe(recipeFromDefinition(def, key))
      expect(validateTheme(tokens).filter((issue) => issue.severity === 'error')).toEqual([])
    }
  })
})
