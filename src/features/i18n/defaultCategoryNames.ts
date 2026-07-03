import type { Dictionary } from './dictionary'
import { vi } from './locales/vi'
import { en } from './locales/en'
import { zh } from './locales/zh'
import { ja } from './locales/ja'

type DefaultCategoryKey =
  | 'defaultCategoryWork'
  | 'defaultCategoryHealth'
  | 'defaultCategoryLearning'
  | 'defaultCategoryPersonal'
  | 'defaultCategorySocial'
  | 'defaultCategoryMeal'

const DEFAULT_CATEGORY_KEYS: DefaultCategoryKey[] = [
  'defaultCategoryWork',
  'defaultCategoryHealth',
  'defaultCategoryLearning',
  'defaultCategoryPersonal',
  'defaultCategorySocial',
  'defaultCategoryMeal',
]

const ALL_DICTIONARIES = [vi, en, zh, ja]

/** Maps every known translation of a seeded default category name to its key. */
const NAME_TO_KEY = new Map<string, DefaultCategoryKey>(
  ALL_DICTIONARIES.flatMap((dict) => DEFAULT_CATEGORY_KEYS.map((key) => [dict[key], key] as const)),
)

/**
 * Categories are user data (renamable in the DB), but the six categories
 * seeded at signup are literal strings in one language. Translate a category
 * name for display only when it still exactly matches one of those seeded
 * defaults in any locale — anything the user has renamed passes through
 * untouched.
 */
export function translateCategoryName(name: string, t: Dictionary): string {
  const key = NAME_TO_KEY.get(name)
  return key ? t[key] : name
}
