import dayjs, { type Dayjs } from 'dayjs'
import { addDays, toISODate } from '@/lib/utils/date'

export interface MiniCalendarCell {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  inWeek: boolean
  isSelected: boolean
}

/** Builds the 6x7 (42-cell) grid for a month, aligned to a Monday-start week. */
export function buildMiniCalendarCells(
  year: number,
  month: number,
  weekStart: Dayjs,
  selected: Dayjs,
): MiniCalendarCell[] {
  const firstOfMonth = dayjs().year(year).month(month).date(1).startOf('day')
  const startOffset = (firstOfMonth.day() + 6) % 7
  const gridStart = addDays(firstOfMonth, -startOffset)
  const todayISO = toISODate(dayjs())
  const selectedISO = toISODate(selected)
  const weekEnd = addDays(weekStart, 6)

  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i)
    const iso = toISODate(date)
    return {
      iso,
      day: date.date(),
      inMonth: date.month() === month,
      isToday: iso === todayISO,
      inWeek: !date.isBefore(weekStart) && !date.isAfter(weekEnd),
      isSelected: iso === selectedISO,
    }
  })
}
