import { useState } from 'react'
import { CheckIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { GradientButton } from '@/components/common/GradientButton'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { describeError } from '@/lib/utils/errorMessage'
import { parseISODate } from '@/lib/utils/date'
import {
  useCreateDailyNote,
  useDailyNotes,
  useDeleteDailyNote,
  useToggleDailyNote,
  useToggleDailyNoteSpecial,
} from '../hooks/useDailyNotes'
import { SPECIAL_DAY_COLOR } from '../constants'

interface DailyNotesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ISO date new notes default to — the day currently on screen. */
  defaultDate: string
}

/**
 * Notes grouped by day. Each can be ticked off (struck through) once done, and
 * every group shows the date it was written for.
 */
export function DailyNotesModal({ open, onOpenChange, defaultDate }: DailyNotesModalProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: notes = [] } = useDailyNotes()
  const create = useCreateDailyNote()
  const toggle = useToggleDailyNote()
  const remove = useDeleteDailyNote()
  const toggleSpecial = useToggleDailyNoteSpecial()
  const [text, setText] = useState('')
  const [special, setSpecial] = useState(false)
  // null = follow the day on screen until the user picks one explicitly.
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const noteDate = pickedDate ?? defaultDate

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    create.mutate(
      { text: value, noteDate, special },
      {
        onSuccess: () => {
          setText('')
          setSpecial(false)
        },
        onError: (error) => toast.error(describeError(t, error)),
      },
    )
  }

  const groups: { date: string; items: typeof notes }[] = []
  for (const note of notes) {
    const last = groups[groups.length - 1]
    if (last && last.date === note.note_date) last.items.push(note)
    else groups.push({ date: note.note_date, items: [note] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 max-sm:pb-0 sm:w-[calc(100%-2rem)] sm:max-w-[680px] sm:rounded-[26px]"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="h-2" style={{ background: theme.brandGrad }} />
        <div className="flex max-h-[90dvh] min-w-0 flex-col gap-4 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
          <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
            📝 {t.dailyNotes}
          </DialogTitle>

          <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-2.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
              }}
              placeholder={t.dailyNotePh}
              rows={5}
              maxLength={2000}
              className="min-h-[120px] w-full resize-y rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-extrabold" style={{ color: theme.muted }}>
                {t.dailyNoteDate}
                <Input
                  type="date"
                  value={noteDate}
                  onChange={(e) => e.target.value && setPickedDate(e.target.value)}
                  className="h-9 w-auto text-[13px]"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                />
              </label>
              <button
                type="button"
                aria-pressed={special}
                onClick={() => setSpecial((v) => !v)}
                className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-xs font-extrabold transition-colors"
                style={{
                  borderColor: special ? SPECIAL_DAY_COLOR : theme.border,
                  background: special ? `${SPECIAL_DAY_COLOR}22` : 'transparent',
                  color: special ? SPECIAL_DAY_COLOR : theme.muted,
                }}
              >
                🎉 {t.dailyNoteSpecial}
              </button>
              <GradientButton
                type="submit"
                disabled={create.isPending || text.trim().length === 0}
                className="h-10 gap-1.5 px-5"
              >
                <PlusIcon className="size-4" />
                {t.dailyNoteAdd}
              </GradientButton>
            </div>
          </form>

          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-y-auto">
            {groups.length === 0 && (
              <p className="py-6 text-center text-sm font-semibold" style={{ color: theme.muted }}>
                {t.dailyNotesEmpty}
              </p>
            )}
            {groups.map((group) => (
              <section key={group.date}>
                <div className="mb-1.5 text-xs font-extrabold" style={{ color: theme.muted }}>
                  {parseISODate(group.date).format('DD/MM/YYYY')}
                </div>
                <ul className="flex flex-col gap-1.5">
                  {group.items.map((note) => (
                    <li
                      key={note.id}
                      className="flex min-w-0 items-start gap-2.5 rounded-xl border-l-4 px-3 py-2"
                      style={{
                        background: theme.chip,
                        borderLeftColor: note.special ? SPECIAL_DAY_COLOR : 'transparent',
                      }}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={note.done}
                        onClick={() => toggle.mutate({ id: note.id, done: !note.done })}
                        className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-md border-2"
                        style={{
                          borderColor: note.done ? theme.accent : theme.border,
                          background: note.done ? theme.accent : 'transparent',
                        }}
                      >
                        {note.done && <CheckIcon className="size-3.5 text-white" strokeWidth={4} />}
                      </button>
                      <span
                        className={`min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] [overflow-wrap:anywhere] font-semibold ${note.done ? 'line-through' : ''}`}
                        style={{ opacity: note.done ? 0.5 : 1 }}
                      >
                        {note.text}
                      </span>
                      <button
                        type="button"
                        aria-label={t.dailyNoteSpecial}
                        title={t.dailyNoteSpecial}
                        aria-pressed={note.special}
                        onClick={() =>
                          toggleSpecial.mutate(
                            { id: note.id, special: !note.special },
                            { onError: (error) => toast.error(describeError(t, error)) },
                          )
                        }
                        className="mt-0.5 flex-shrink-0 text-[15px] leading-none transition-all hover:opacity-100"
                        style={{ opacity: note.special ? 1 : 0.3, filter: note.special ? 'none' : 'grayscale(1)' }}
                      >
                        🎉
                      </button>
                      <button
                        type="button"
                        aria-label={t.dailyNoteDelete}
                        onClick={() =>
                          remove.mutate(note.id, {
                            onError: (error) => toast.error(describeError(t, error)),
                          })
                        }
                        className="mt-0.5 flex-shrink-0 opacity-50 transition-opacity hover:opacity-100"
                        style={{ color: theme.danger }}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
