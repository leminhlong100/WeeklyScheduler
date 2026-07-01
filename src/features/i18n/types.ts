export const LOCALES = ['vi', 'en', 'zh', 'ja'] as const

export type Locale = (typeof LOCALES)[number]

/** A piece of UI text with a translation for every supported locale. */
export type LocalizedText = Record<Locale, string>
