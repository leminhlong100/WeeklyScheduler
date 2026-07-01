import type { Dayjs } from 'dayjs'
import type { Locale } from '@/features/i18n/types'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { buildMiniCalendarCells } from '../utils/buildMiniCalendarCells'

interface MiniCalendarProps {
  locale: Locale
  t: Dictionary
  theme: DerivedTheme
  year: number
  month: number
  weekStart: Dayjs
  selected: Dayjs
  onPrevMonth: () => void
  onNextMonth: () => void
  onPickDay: (iso: string) => void
}

function formatMonthLabel(locale: Locale, t: Dictionary, year: number, month: number): string {
  return locale === 'zh' || locale === 'ja' ? `${year}年${month + 1}月` : `${t.mon[month]} ${year}`
}

export function MiniCalendar({
  locale,
  t,
  theme,
  year,
  month,
  weekStart,
  selected,
  onPrevMonth,
  onNextMonth,
  onPickDay,
}: MiniCalendarProps) {
  const cells = buildMiniCalendarCells(year, month, weekStart, selected)

  return (
    <div
      className="rounded-[20px] border px-[15px] pt-[15px] pb-[13px] backdrop-blur-sm"
      style={{ background: theme.sidebarCard, borderColor: theme.sidebarBorder }}
    >
      <div className="mb-[11px] flex items-center justify-between">
        <div className="font-heading text-[15px] font-bold text-white">
          {formatMonthLabel(locale, t, year, month)}
        </div>
        <div className="flex gap-[5px]">
          <button
            type="button"
            onClick={onPrevMonth}
            className="grid h-7 w-7 place-items-center rounded-[10px] bg-white/22 text-[15px] leading-none text-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="grid h-7 w-7 place-items-center rounded-[10px] bg-white/22 text-[15px] leading-none text-white"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-[5px] grid grid-cols-7 gap-0.5">
        {t.miniDow.map((label, i) => (
          <div key={i} className="py-0.5 text-center text-[10.5px] font-extrabold text-white/78">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => (
          <button
            key={cell.iso}
            type="button"
            onClick={() => onPickDay(cell.iso)}
            className="rounded-[9px] text-xs transition-all"
            style={{
              aspectRatio: '1',
              fontWeight: cell.isSelected ? 700 : cell.isToday ? 800 : cell.inMonth ? 600 : 400,
              color: cell.isSelected ? theme.accent : cell.inMonth ? '#ffffff' : 'rgba(255,255,255,.42)',
              background: cell.isSelected ? '#ffffff' : cell.inWeek ? 'rgba(255,255,255,.16)' : 'transparent',
            }}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  )
}
