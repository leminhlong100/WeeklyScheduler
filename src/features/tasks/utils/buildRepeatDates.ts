import { addDays, parseISODate, toISODate } from '@/lib/utils/date'

/**
 * Expands a "repeat on these weekdays, for this many weeks" choice into the
 * concrete dates to create, starting from `weekStartISO` (a Monday).
 *
 * `repeatWeeks` of 1 means no repeat — just the picked weekdays of that one
 * week, which is what the form did before repeating existed. Dates come back
 * sorted so the first one is always the occurrence the user is looking at.
 */
export function buildRepeatDates(
  weekStartISO: string,
  dowIndexes: number[],
  repeatWeeks: number,
): string[] {
  const weekStart = parseISODate(weekStartISO)
  const weeks = Math.max(1, Math.trunc(repeatWeeks))
  const dates: string[] = []

  for (let week = 0; week < weeks; week++) {
    for (const dow of dowIndexes) {
      dates.push(toISODate(addDays(weekStart, week * 7 + dow)))
    }
  }

  return dates.sort()
}
