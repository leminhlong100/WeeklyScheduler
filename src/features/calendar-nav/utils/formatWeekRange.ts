import type { Dayjs } from 'dayjs'
import type { Locale } from '@/features/i18n/types'
import type { Dictionary } from '@/features/i18n/dictionary'

/** Locale-aware "Jan 5 – 11, 2026" style week range, matching the design's date formats. */
export function formatWeekRange(locale: Locale, t: Dictionary, start: Dayjs, end: Dayjs): string {
  const startMonth = start.month()
  const endMonth = end.month()
  const year = start.year()
  const startDay = start.date()
  const endDay = end.date()

  if (locale === 'zh' || locale === 'ja') {
    const endPrefix = startMonth === endMonth ? '' : `${endMonth + 1}月`
    return `${year}年${startMonth + 1}月${startDay}日 – ${endPrefix}${endDay}日`
  }

  if (locale === 'en') {
    return startMonth === endMonth
      ? `${t.mon[startMonth]} ${startDay} – ${endDay}, ${year}`
      : `${t.mon[startMonth]} ${startDay} – ${t.mon[endMonth]} ${endDay}, ${year}`
  }

  return startMonth === endMonth
    ? `${startDay} – ${endDay} ${t.mon[startMonth]}, ${year}`
    : `${startDay} ${t.mon[startMonth]} – ${endDay} ${t.mon[endMonth]}, ${year}`
}
