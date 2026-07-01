import dayjs, { type Dayjs } from 'dayjs'

export const ISO_DATE_FORMAT = 'YYYY-MM-DD'

export function toISODate(d: Dayjs | Date): string {
  return dayjs(d).format(ISO_DATE_FORMAT)
}

export function parseISODate(iso: string): Dayjs {
  return dayjs(iso, ISO_DATE_FORMAT)
}

export function addDays(d: Dayjs, days: number): Dayjs {
  return d.add(days, 'day')
}

/** Monday of the ISO week containing `d` (week starts Monday, ends Sunday). */
export function startOfWeekMonday(d: Dayjs): Dayjs {
  const weekday = (d.day() + 6) % 7 // Sun=0..Sat=6 -> Mon=0..Sun=6
  return addDays(d, -weekday).startOf('day')
}

export function isSameDate(a: Dayjs, b: Dayjs): boolean {
  return a.format(ISO_DATE_FORMAT) === b.format(ISO_DATE_FORMAT)
}

export function todayISO(): string {
  return toISODate(dayjs())
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Minutes since midnight -> `HH:MM`. */
export function formatMinutesAsTime(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`
}

export function minutesNow(): number {
  const now = dayjs()
  return now.hour() * 60 + now.minute()
}
