import type { ReactNode } from 'react'
import { CopyIcon, PencilIcon, StickyNoteIcon, Trash2Icon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { DerivedTheme } from '@/features/theme/types'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatMinutesAsTime } from '@/lib/utils/date'
import type { TaskWithCategory } from '../types'

interface TaskActionSheetProps {
  task: TaskWithCategory | null
  onClose: () => void
  onEdit: (id: string) => void
  onOpenNotes: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * Mobile-only bottom sheet opened by tapping a task block — consolidates the
 * actions desktop spreads across a single click (notes popover), double
 * click (edit) and right-click (duplicate/delete context menu), none of
 * which map cleanly onto touch.
 */
export function TaskActionSheet({ task, onClose, onEdit, onOpenNotes, onDuplicate, onDelete }: TaskActionSheetProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  return (
    <Dialog open={!!task} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 sm:hidden"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        {task && (
          <>
            <div className="h-2" style={{ background: theme.brandGrad }} />
            <div className="flex flex-col gap-4 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-lg"
                  style={{ background: `${task.categoryColor}33` }}
                >
                  {task.categoryEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle
                    className="font-heading truncate text-base font-extrabold"
                    style={{ color: theme.text }}
                  >
                    {task.title}
                  </DialogTitle>
                  <div className="text-xs font-semibold" style={{ color: theme.muted }}>
                    {formatMinutesAsTime(task.startMinute)} –{' '}
                    {formatMinutesAsTime(task.startMinute + task.durationMinute)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <ActionRow theme={theme} label={t.editEvent} onClick={() => onEdit(task.id)}>
                  <PencilIcon className="size-4" />
                </ActionRow>
                <ActionRow theme={theme} label={t.note} onClick={() => onOpenNotes(task.id)}>
                  <StickyNoteIcon className="size-4" />
                </ActionRow>
                <ActionRow theme={theme} label={t.duplicate} onClick={() => onDuplicate(task.id)}>
                  <CopyIcon className="size-4" />
                </ActionRow>
                <ActionRow theme={theme} label={t.delete} danger onClick={() => onDelete(task.id)}>
                  <Trash2Icon className="size-4" />
                </ActionRow>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ActionRow({
  theme,
  label,
  danger,
  onClick,
  children,
}: {
  theme: DerivedTheme
  label: string
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 flex-shrink-0 items-center gap-3 rounded-2xl px-3.5 text-left text-sm font-bold"
      style={{ background: theme.chip, color: danger ? theme.danger : theme.text }}
    >
      <span
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
        style={{ background: danger ? `${theme.dangerBorder}55` : theme.panel }}
      >
        {children}
      </span>
      {label}
    </button>
  )
}
