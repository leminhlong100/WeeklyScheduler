import type { Dayjs } from 'dayjs'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateCategoryName } from '@/features/i18n/defaultCategoryNames'
import type { DerivedTheme } from '@/features/theme/types'
import type { Category } from '@/features/categories/api/categoriesApi'
import { parseISODate } from '@/lib/utils/date'
import type { Task } from '../api/tasksApi'
import { computeWeekStats } from '../utils/weekStats'

interface WeekStatsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  categories: Category[]
  weekStart: Dayjs
}

/** Minutes -> "2h30" / "45m", matching how durations read in the task form. */
function formatMinutes(minutes: number, minuteShort: string): string {
  if (minutes < 60) return `${minutes}${minuteShort}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`
}

function StatTile({ theme, label, value }: { theme: DerivedTheme; label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl px-3 py-2.5" style={{ background: theme.chip }}>
      <div className="truncate text-[10.5px] font-extrabold tracking-wider uppercase" style={{ color: theme.muted }}>
        {label}
      </div>
      <div className="font-heading truncate text-[17px] font-extrabold" style={{ color: theme.text }}>
        {value}
      </div>
    </div>
  )
}

/**
 * A read-only summary of the week already on screen. Computed from the grid's
 * own task list, so opening it costs no extra request and it always agrees
 * with what the grid is showing — including the active category filter's
 * effect being deliberately *absent*: this counts the whole week.
 */
export function WeekStatsModal({ open, onOpenChange, tasks, categories, weekStart }: WeekStatsModalProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const stats = computeWeekStats(tasks, categories, (taskDate) =>
    parseISODate(taskDate).diff(weekStart, 'day'),
  )
  const peakDayMinutes = Math.max(...stats.minutesByDay, 1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 max-sm:pb-0 sm:w-[calc(100%-2rem)] sm:max-w-[460px] sm:rounded-[26px]"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="h-2" style={{ background: theme.brandGrad }} />
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
          <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
            {t.weekStats}
          </DialogTitle>

          {stats.taskCount === 0 ? (
            <p className="py-6 text-center text-[12.5px] font-semibold" style={{ color: theme.muted }}>
              {t.statsEmpty}
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <StatTile
                  theme={theme}
                  label={t.statsTotalTime}
                  value={formatMinutes(stats.totalMinutes, t.minuteShort)}
                />
                <StatTile theme={theme} label={t.statsTaskCount} value={String(stats.taskCount)} />
              </div>
              <div className="flex gap-2">
                <StatTile
                  theme={theme}
                  label={t.statsDone}
                  value={`${stats.doneCount}/${stats.taskCount}`}
                />
                <StatTile
                  theme={theme}
                  label={t.statsBusiestDay}
                  value={stats.busiestDayIndex === null ? '—' : t.dow[stats.busiestDayIndex]}
                />
              </div>

              <div className="flex items-end justify-between gap-1.5">
                {stats.minutesByDay.map((minutes, dayIndex) => (
                  <div key={dayIndex} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="flex h-20 w-full items-end">
                      <div
                        className="w-full rounded-t-lg transition-[height] duration-300"
                        style={{
                          // A floor of 3px keeps an empty day readable as a
                          // baseline instead of vanishing from the row.
                          height: `${Math.max(3, (minutes / peakDayMinutes) * 80)}px`,
                          background: minutes > 0 ? theme.brandGrad : theme.border,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-extrabold" style={{ color: theme.muted }}>
                      {t.dow[dayIndex]}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 text-[11px] font-extrabold tracking-wider uppercase" style={{ color: theme.muted }}>
                  {t.statsByCategory}
                </div>
                <div className="flex flex-col gap-2.5">
                  {stats.byCategory.map((bucket) => (
                    <div key={bucket.id ?? 'uncategorized'}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex-shrink-0 text-sm leading-none">{bucket.emoji}</span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold" style={{ color: theme.text }}>
                          {bucket.name === null
                            ? t.statsUncategorized
                            : translateCategoryName(bucket.name, t)}
                        </span>
                        <span className="flex-shrink-0 text-[12px] font-extrabold" style={{ color: theme.muted }}>
                          {formatMinutes(bucket.minutes, t.minuteShort)} · {Math.round(bucket.share * 100)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: theme.border }}>
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${bucket.share * 100}%`, background: bucket.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
