import {
  GRID_END_MINUTE,
  GRID_START_MINUTE,
  HOUR_HEIGHT_PX,
  MIN_TASK_DURATION_MINUTES,
} from '@/constants/grid'

export function minutesToTopPx(startMinute: number): number {
  return ((startMinute - GRID_START_MINUTE) / 60) * HOUR_HEIGHT_PX
}

export function durationToHeightPx(durationMinute: number): number {
  return (durationMinute / 60) * HOUR_HEIGHT_PX
}

export function gridTotalHeightPx(): number {
  return ((GRID_END_MINUTE - GRID_START_MINUTE) / 60) * HOUR_HEIGHT_PX
}

/** Pixel delta (dragging) -> snapped minute delta. */
export function pxDeltaToSnappedMinutes(dyPx: number, snapMinutes: number): number {
  return Math.round((dyPx / HOUR_HEIGHT_PX / snapMinutes) * 60) * snapMinutes
}

export function clampStartMinute(startMinute: number, durationMinute: number): number {
  return Math.max(GRID_START_MINUTE, Math.min(startMinute, GRID_END_MINUTE - durationMinute))
}

export function clampDurationMinute(durationMinute: number, startMinute: number): number {
  return Math.max(
    MIN_TASK_DURATION_MINUTES,
    Math.min(durationMinute, GRID_END_MINUTE - startMinute),
  )
}
