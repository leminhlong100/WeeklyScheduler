import { LOCALES, type LocalizedText } from '@/features/i18n/types'

/**
 * Lifts a single user-typed string into the shape the UI reads
 * (`def.name[locale]`).
 *
 * Every locale gets the same string, and that is correct rather than a
 * shortcut: a theme name is a proper noun the user chose, so showing "Vườn phép
 * thuật" to the same account in Japanese is the expected behaviour, not a
 * missing translation.
 */
export function toLocalizedText(value: string): LocalizedText {
  return Object.fromEntries(LOCALES.map((locale) => [locale, value])) as LocalizedText
}

/** Reads a name that may be either shape, for callers holding a bare string. */
export function readLocalizedText(
  value: string | LocalizedText,
  locale: keyof LocalizedText,
): string {
  return typeof value === 'string' ? value : value[locale]
}
