import { useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { formatMinutesAsTime, parseISODate, weekdayMondayIndex } from '@/lib/utils/date'
import { MIN_SEARCH_LENGTH, useTaskSearch } from '../hooks/useTaskSearch'
import { UNCATEGORIZED_COLOR, UNCATEGORIZED_EMOJI } from '../types'

interface TaskSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Jumps the grid to the picked task's day; the modal closes itself first. */
  onPickDate: (taskDate: string) => void
}

/**
 * Title search across every week, not just the one on screen — the grid alone
 * gives no way to find an event you can't remember the date of. Picking a
 * result navigates the grid to that day rather than opening an editor, so the
 * task is shown in the context it lives in.
 */
export function TaskSearchModal({ open, onOpenChange, onPickDate }: TaskSearchModalProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useCategories()
  const [query, setQuery] = useState('')

  const { data: results = [], isFetching } = useTaskSearch(query)
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const tooShort = query.trim().length < MIN_SEARCH_LENGTH

  const handlePick = (taskDate: string) => {
    onOpenChange(false)
    onPickDate(taskDate)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Clearing on close means reopening starts fresh instead of showing
        // the previous search's stale hit list.
        if (!next) setQuery('')
        onOpenChange(next)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 max-sm:pb-0 sm:w-[calc(100%-2rem)] sm:max-w-[480px] sm:rounded-[26px]"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="h-2" style={{ background: theme.brandGrad }} />
        <div className="flex max-h-[85dvh] flex-col gap-3 overflow-hidden px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
          <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
            {t.search}
          </DialogTitle>

          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              style={{ color: theme.muted }}
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPh}
              className="pl-9"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
            />
          </div>

          {tooShort ? (
            <p className="py-6 text-center text-[12.5px] font-semibold" style={{ color: theme.muted }}>
              {t.searchMinChars.replace('{n}', String(MIN_SEARCH_LENGTH))}
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] font-semibold" style={{ color: theme.muted }}>
              {isFetching ? '…' : t.searchNoResults}
            </p>
          ) : (
            <>
              <div className="text-[11px] font-extrabold tracking-wider uppercase" style={{ color: theme.muted }}>
                {t.searchResultsCount.replace('{n}', String(results.length))}
              </div>
              <div className="-mx-1 flex flex-col gap-1.5 overflow-y-auto px-1">
                {results.map((task) => {
                  const category = task.category_id ? categoryById.get(task.category_id) : undefined
                  const date = parseISODate(task.task_date)
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handlePick(task.task_date)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-transform duration-150 active:scale-[0.98]"
                      style={{ background: theme.chip }}
                    >
                      <span
                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-base"
                        style={{ background: `${category?.color ?? UNCATEGORIZED_COLOR}33` }}
                      >
                        {category?.emoji ?? UNCATEGORIZED_EMOJI}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-[13.5px] font-bold ${task.done ? 'line-through opacity-60' : ''}`}
                          style={{ color: theme.text }}
                        >
                          {task.title}
                        </div>
                        <div className="truncate text-[11.5px] font-semibold" style={{ color: theme.muted }}>
                          {t.dow[weekdayMondayIndex(date)]} {date.format('DD/MM/YYYY')} ·{' '}
                          {formatMinutesAsTime(task.start_minute)}–
                          {formatMinutesAsTime(task.start_minute + task.duration_minute)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
