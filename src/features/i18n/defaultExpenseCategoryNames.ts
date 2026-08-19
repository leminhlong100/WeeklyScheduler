import type { Dictionary } from './dictionary'
import { vi } from './locales/vi'
import { en } from './locales/en'
import { zh } from './locales/zh'
import { ja } from './locales/ja'

type DefaultExpenseCategoryKey =
  | 'defaultExpenseCategoryFood'
  | 'defaultExpenseCategoryTransport'
  | 'defaultExpenseCategoryHome'
  | 'defaultExpenseCategoryShopping'
  | 'defaultExpenseCategoryHealth'
  | 'defaultExpenseCategoryFun'
  | 'defaultExpenseCategoryOther'

const DEFAULT_EXPENSE_CATEGORY_KEYS: DefaultExpenseCategoryKey[] = [
  'defaultExpenseCategoryFood',
  'defaultExpenseCategoryTransport',
  'defaultExpenseCategoryHome',
  'defaultExpenseCategoryShopping',
  'defaultExpenseCategoryHealth',
  'defaultExpenseCategoryFun',
  'defaultExpenseCategoryOther',
]

const ALL_DICTIONARIES = [vi, en, zh, ja]

const NAME_TO_KEY = new Map<string, DefaultExpenseCategoryKey>(
  ALL_DICTIONARIES.flatMap((dict) =>
    DEFAULT_EXPENSE_CATEGORY_KEYS.map((key) => [dict[key], key] as const),
  ),
)

/**
 * Song song với `translateCategoryName` cho danh mục công việc: 7 danh mục chi
 * tiêu được seed bằng chuỗi tiếng Việt trong migration 0009, nên chỉ dịch khi
 * tên vẫn khớp đúng một trong các bản mặc định. User đổi tên rồi thì giữ nguyên.
 */
export function translateExpenseCategoryName(name: string, t: Dictionary): string {
  const key = NAME_TO_KEY.get(name)
  return key ? t[key] : name
}
