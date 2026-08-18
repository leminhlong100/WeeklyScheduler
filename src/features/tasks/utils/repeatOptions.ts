import type { Dictionary } from '@/features/i18n/dictionary'
import type { SelectOption } from './taskFormOptions'

/** 1 = no repeat; the rest are round numbers of weeks (a term, a quarter, a year). */
const REPEAT_WEEK_STEPS = [1, 2, 4, 8, 12, 26, 52]

export function buildRepeatOptions(t: Dictionary): SelectOption[] {
  return REPEAT_WEEK_STEPS.map((weeks) => ({
    value: weeks,
    label: weeks === 1 ? t.repeatNone : t.repeatWeeksCount.replace('{n}', String(weeks)),
  }))
}
