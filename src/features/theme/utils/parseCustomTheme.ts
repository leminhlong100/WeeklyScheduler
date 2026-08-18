import { buildTokensFromRecipe } from '../recipe/buildTheme'
import type { CustomThemeRecord } from '../recipe/types'
import { customThemeRowSchema, themeTokensSchema } from '../schemas/customThemeSchema'
import { customThemeId, type ThemeDefinition, type ThemeTokens } from '../types'
import { toLocalizedText } from './localizedText'

/**
 * The single door every stored theme comes through — a database row, a
 * localStorage snapshot, or a payload written by an older build of this client.
 *
 * **Never throws, never partially succeeds.** A theme that fails validation
 * disappears from the picker; it does not take the render tree down with it.
 * The alternative — trusting the `jsonb` columns because we wrote them — breaks
 * the moment a token is renamed, because every existing row still carries the old
 * shape.
 */
export function parseCustomTheme(row: unknown): CustomThemeRecord | null {
  const parsed = customThemeRowSchema.safeParse(row)
  if (!parsed.success) return null
  const { id, name, icon, recipe, overrides, art } = parsed.data

  let tokens: ThemeTokens
  try {
    tokens = buildTokensFromRecipe(recipe)
  } catch {
    return null
  }

  // Validate the *merged* object, not the two halves — that object is the only
  // thing `deriveTheme` ever sees. Individually-bad overrides were already
  // dropped by `storedTokenOverridesSchema`, so a failure here means a *derived*
  // token came out invalid, which is a bug rather than bad input: fail closed.
  const merged = themeTokensSchema.safeParse({ ...tokens, ...overrides })
  if (!merged.success) return null

  const definition: ThemeDefinition = {
    key: customThemeId(id),
    name: toLocalizedText(name),
    icon,
    ...merged.data,
    ...(art ? { art } : {}),
  }

  return { id, name, icon, recipe, overrides, art: art ?? null, definition }
}

/** Maps a batch of rows, silently dropping the ones that don't validate. */
export function parseCustomThemes(rows: unknown[]): CustomThemeRecord[] {
  return rows
    .map(parseCustomTheme)
    .filter((record): record is CustomThemeRecord => record !== null)
}
