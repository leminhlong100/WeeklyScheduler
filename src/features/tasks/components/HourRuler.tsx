import { GRID_END_MINUTE, GRID_START_MINUTE, HOUR_HEIGHT_PX } from '@/constants/grid'
import { formatMinutesAsTime } from '@/lib/utils/date'
import { gridTotalHeightPx } from '../utils/gridMath'
import type { DerivedTheme } from '@/features/theme/types'

interface HourRulerProps {
  theme: DerivedTheme
}

export function HourRuler({ theme }: HourRulerProps) {
  const hours: { label: string; top: number }[] = []
  for (let h = GRID_START_MINUTE / 60; h <= GRID_END_MINUTE / 60; h++) {
    hours.push({ label: formatMinutesAsTime(h * 60), top: (h - GRID_START_MINUTE / 60) * HOUR_HEIGHT_PX })
  }

  return (
    <div className="relative w-16 flex-shrink-0" style={{ height: gridTotalHeightPx() }}>
      {hours.map((h) => (
        <div
          key={h.label}
          className={`absolute right-[9px] whitespace-nowrap text-[11px] font-bold ${h.top === 0 ? '' : '-translate-y-1/2'}`}
          style={{ top: h.top, color: theme.muted }}
        >
          {h.label}
        </div>
      ))}
    </div>
  )
}
