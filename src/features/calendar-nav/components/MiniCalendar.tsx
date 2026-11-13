import type { Dayjs } from 'dayjs'
import type { Locale } from '@/features/i18n/types'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { NOTE_DOT_COLOR, SPECIAL_DAY_COLOR } from '@/features/daily-notes/constants'
import { buildMiniCalendarCells } from '../utils/buildMiniCalendarCells'

/** Per-day note summary, keyed by ISO date. */
export type DayNoteMarks = ReadonlyMap<string, { special: boolean }>

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
  /** Days with notes get a red dot; special days (birthday, party…) are highlighted. */
  noteMarks?: DayNoteMarks
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
  noteMarks,
}: MiniCalendarProps) {
  const cells = buildMiniCalendarCells(year, month, weekStart, selected)

  return (
    <div
      className="rounded-[20px] border px-[15px] pt-[15px] pb-[13px] backdrop-blur-sm"
      style={{ background: theme.sidebarCard, borderColor: theme.sidebarBorder }}
    >
      <div className="mb-[11px] flex items-center justify-between">
        <div className="font-heading text-[15px] font-bold text-(--side-fg)">
          {formatMonthLabel(locale, t, year, month)}
        </div>
        <div className="flex gap-[5px]">
          <button
            type="button"
            onClick={onPrevMonth}
            className="grid h-7 w-7 place-items-center rounded-[10px] bg-white/22 text-[15px] leading-none text-(--side-fg)"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="grid h-7 w-7 place-items-center rounded-[10px] bg-white/22 text-[15px] leading-none text-(--side-fg)"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-[5px] grid grid-cols-7 gap-0.5">
        {t.miniDow.map((label, i) => (
          <div
            key={i}
            className="py-0.5 text-center text-[10.5px] font-extrabold text-(--side-muted)"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const mark = noteMarks?.get(cell.iso)
          const special = mark?.special ?? false
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onPickDay(cell.iso)}
              className="relative rounded-[9px] text-xs transition-all"
              style={{
                aspectRatio: '1',
                fontWeight: cell.isSelected || special ? 800 : cell.isToday ? 800 : cell.inMonth ? 600 : 400,
                color: cell.isSelected
                  ? special
                    ? SPECIAL_DAY_COLOR
                    : theme.accentText
                  : special
                    ? '#ffffff'
                    : cell.inMonth
                      ? 'var(--side-fg)'
                      : 'var(--side-muted)',
                background: cell.isSelected
                  ? '#ffffff'
                  : special
                    ? `linear-gradient(135deg, ${SPECIAL_DAY_COLOR}, #ffb04d)`
                    : cell.inWeek
                      ? 'rgba(255,255,255,.16)'
                      : 'transparent',
                boxShadow: special
                  ? `0 0 0 1.5px ${cell.isSelected ? SPECIAL_DAY_COLOR : 'rgba(255,255,255,.7)'}, 0 2px 8px ${SPECIAL_DAY_COLOR}66`
                  : undefined,
                opacity: special && !cell.inMonth ? 0.6 : 1,
              }}
            >
              {cell.day}
              {special && (
                <span aria-hidden className="absolute -top-1 -right-1 text-[9px] leading-none">
                  🎉
                </span>
              )}
              {mark && !special && (
                <span
                  aria-hidden
                  className="absolute bottom-[3px] left-1/2 size-[5px] -translate-x-1/2 rounded-full"
                  style={{ background: NOTE_DOT_COLOR, boxShadow: '0 0 0 1px rgba(255,255,255,.55)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
