import { useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { GradientButton } from '@/components/common/GradientButton'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { DerivedTheme } from '@/features/theme/types'
import { rgba } from '@/lib/utils/color'
import { minutesToTopPx } from '../utils/gridMath'
import type { TaskNoteItem, TaskWithCategory } from '../types'

interface TaskNotePopoverProps {
  task: TaskWithCategory
  theme: DerivedTheme
  side: 'left' | 'right'
  onClose: () => void
  onSave: (notes: TaskNoteItem[]) => void
}

/**
 * A checklist "sticky note" anchored beside a task block, positioned with the
 * same grid math as `TaskBlock`/`NowIndicator` rather than a measured DOM
 * rect. Only closes via its own X — no outside-click or Escape dismissal on
 * either desktop or mobile, so edits in progress (or a stray tap while
 * scrolling) can't accidentally lose the note.
 *
 * The parent keys this component by `task.id`, so switching to a different
 * task's note remounts it fresh — `items`/`isEditing` only need to seed from
 * `task.notes` once, not resync on every parent re-render.
 */
export function TaskNotePopover({ task, theme, side, onClose, onSave }: TaskNotePopoverProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  // A task with no notes yet opens straight into editing with one blank row
  // ready to type into — showing an empty read view first just adds a
  // mandatory tap on the pencil (and another on "+") before typing.
  const [items, setItems] = useState<TaskNoteItem[]>(() =>
    task.notes.length > 0 ? task.notes : [{ id: crypto.randomUUID(), text: '', done: false }],
  )
  const [isEditing, setIsEditing] = useState(task.notes.length === 0)

  const toggleDone = (id: string) => {
    const next = items.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    setItems(next)
    onSave(next)
  }

  const updateText = (id: string, text: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const addItem = () => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text: '', done: false }])
  }

  const handleSave = () => {
    const cleaned = items.filter((item) => item.text.trim().length > 0)
    setItems(cleaned)
    onSave(cleaned)
    setIsEditing(false)
  }

  const tailStyle: CSSProperties =
    side === 'right' ? { left: -7, top: 18 } : { right: -7, top: 18 }

  // Mobile: anchored above the bottom action bar (~64px tall + safe area),
  // not at the viewport edge where the bar would cover it.
  const positionStyle: CSSProperties = isMobile
    ? { left: 12, right: 12, bottom: 'calc(76px + env(safe-area-inset-bottom))' }
    : {
        top: minutesToTopPx(task.startMinute),
        [side === 'right' ? 'left' : 'right']: 'calc(100% + 14px)',
      }

  const popover = (
    <div
      className={
        isMobile
          ? 'fixed z-[100] w-auto max-w-[400px] rounded-[18px] border-[1.5px] p-3.5 shadow-2xl'
          : 'absolute z-[100] w-[270px] rounded-[18px] border-[1.5px] p-3.5'
      }
      style={{
        ...positionStyle,
        background: theme.modalBg,
        borderColor: theme.border,
        boxShadow: theme.windowShadow,
        color: theme.text,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {!isMobile && (
        <div
          className="absolute size-3.5 rotate-45 border-[1.5px]"
          style={{ background: theme.modalBg, borderColor: theme.border, ...tailStyle }}
        />
      )}

      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-[13px] font-extrabold" style={{ color: theme.text }}>
          {t.note}: {task.title}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={t.editNote}
            onClick={() => setIsEditing((v) => !v)}
            className="flex size-6 items-center justify-center rounded-full transition-colors"
            style={{
              background: isEditing ? theme.accent : theme.chip,
              color: isEditing ? '#ffffff' : theme.text,
            }}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={t.closeNote}
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-full"
            style={{ background: rgba('#ff5d7a', 0.16), color: '#ff5d7a' }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mt-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto">
        {items.map((item) =>
          isEditing ? (
            <div key={item.id} className="flex items-center gap-1.5">
              <Input
                value={item.text}
                placeholder={t.noteAddItemPh}
                onChange={(e) => updateText(item.id, e.target.value)}
                className="h-8 text-[13px]"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="flex-shrink-0 opacity-60 transition-opacity hover:opacity-100"
                style={{ color: theme.danger }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2 text-[13px]">
              <button
                type="button"
                onClick={() => toggleDone(item.id)}
                className="mt-0.5 flex size-4 flex-shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: item.done ? theme.accent : theme.border,
                  background: item.done ? theme.accent : 'transparent',
                }}
              >
                {item.done && <span className="block size-1.5 rounded-full bg-white" />}
              </button>
              <span style={{ color: theme.text, opacity: item.done ? 0.5 : 1 }} className={item.done ? 'line-through' : ''}>
                {item.text}
              </span>
            </div>
          ),
        )}

        {isEditing && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-[12.5px] font-bold opacity-70 transition-opacity hover:opacity-100"
            style={{ color: theme.text }}
          >
            <Plus className="size-3.5" />
            {t.noteAddItemPh}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="relative mt-3 flex justify-end">
          <GradientButton onClick={handleSave} className="h-8 px-4 text-[12.5px]">
            {t.save}
          </GradientButton>
        </div>
      )}
    </div>
  )

  // Portaled on mobile: rendered in place it inherits the scroll container's
  // stacking context (z-50), which the z-60 bottom action bar paints over —
  // as a body child its own z-index actually wins.
  return isMobile ? createPortal(popover, document.body) : popover
}
