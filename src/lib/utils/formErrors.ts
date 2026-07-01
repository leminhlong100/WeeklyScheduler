import type { Dictionary } from '@/features/i18n/dictionary'

/**
 * Form schemas store a Dictionary key (e.g. `'fieldRequired'`) as the zod
 * error message so validation stays locale-agnostic. This resolves that key
 * to the current locale's text, falling back to the raw message.
 */
export function translateFieldError(t: Dictionary, message: string | undefined): string | undefined {
  if (!message) return undefined
  const key = message as keyof Dictionary
  const translated = t[key]
  return typeof translated === 'string' ? translated : message
}
