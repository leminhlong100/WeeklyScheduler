import type { DerivedTheme } from '@/features/theme/types'

export interface DayHeaderInfo {
  key: string
  dow: string
  dayNum: number
  isToday: boolean
}

interface DayHeaderRowProps {
  days: DayHeaderInfo[]
  theme: DerivedTheme
}

export function DayHeaderRow({ days, theme }: DayHeaderRowProps) {
  return (
    <div
      className="sticky top-0 z-[6] flex border-b"
      style={{ background: theme.panel, borderColor: theme.borderStrong }}
    >
      <div className="w-16 flex-shrink-0" />
      <div className="flex flex-1">
        {days.map((d) => (
          <div
            key={d.key}
            className="min-w-0 flex-1 border-l px-1 pt-[9px] pb-[11px] text-center"
            style={{ borderColor: theme.border }}
          >
            <div
              className="text-[11.5px] font-extrabold tracking-wide uppercase"
              style={{ color: d.isToday ? theme.accent : theme.muted }}
            >
              {d.dow}
            </div>
            <div
              className="font-heading mx-auto mt-[5px] grid h-9 w-9 place-items-center rounded-[13px] text-lg font-extrabold"
              style={{
                color: d.isToday ? '#fff' : theme.text,
                background: d.isToday ? theme.brandGrad : 'transparent',
                boxShadow: d.isToday ? `0 5px 13px ${theme.brandShadow}` : 'none',
              }}
            >
              {d.dayNum}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
