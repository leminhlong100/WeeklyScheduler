import { GRID_END_MINUTE, GRID_START_MINUTE } from '@/constants/grid'
import { formatMinutesAsTime } from '@/lib/utils/date'
import type { Dictionary } from '@/features/i18n/dictionary'

export interface SelectOption {
  value: number
  label: string
}

export function buildStartTimeOptions(): SelectOption[] {
  const options: SelectOption[] = []
  for (let m = GRID_START_MINUTE; m <= GRID_END_MINUTE - 15; m += 15) {
    options.push({ value: m, label: formatMinutesAsTime(m) })
  }
  return options
}

const DURATION_STEPS_MINUTES = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300]

export function buildDurationOptions(t: Dictionary): SelectOption[] {
  return DURATION_STEPS_MINUTES.map((m) => ({ value: m, label: formatDurationLabel(m, t) }))
}

function formatDurationLabel(minutes: number, t: Dictionary): string {
  if (minutes < 60) return `${minutes}${t.minuteShort}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`
}
