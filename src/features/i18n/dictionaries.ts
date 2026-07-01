import type { Dictionary } from './dictionary'
import type { Locale } from './types'
import { vi } from './locales/vi'
import { en } from './locales/en'
import { zh } from './locales/zh'
import { ja } from './locales/ja'

export const dictionaries: Record<Locale, Dictionary> = { vi, en, zh, ja }
