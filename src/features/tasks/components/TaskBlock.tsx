import type { MouseEvent as ReactMouseEvent, PointerEvent } from 'react'
import { CheckIcon } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import type { DerivedTheme } from '@/features/theme/types'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { formatMinutesAsTime } from '@/lib/utils/date'
import { durationToHeightPx, minutesToTopPx } from '../utils/gridMath'
import { taskBoxStyle } from '../utils/taskBoxStyle'
import { taskColor, type TaskWithCategory } from '../types'
import type { DragMode } from '../hooks/useTaskDragResize'

/** Gap (px) left between two side-by-side task blocks in the same day column. */
const LANE_GUTTER_PX = 3

interface TaskBlockProps {
  task: TaskWithCategory
  theme: DerivedTheme
  isCurrent: boolean
  dragOffset: { dxPx: number; dyPx: number; mode: DragMode } | null
  /** Column this task takes inside its overlap cluster (see `computeTaskLanes`). */
  lane: number
  /** How many columns that cluster is split into — 1 means the task is full width. */
  laneCount: number
  /** Multi-select mode: taps toggle selection (via onPointerDownMove's click fallthrough) instead of opening the note/drag/resize/context menu. */
  selectMode: boolean
  selected: boolean
  onPointerDownMove: (e: PointerEvent) => void
  onPointerDownResize: (e: PointerEvent) => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleDone: () => void
}

export function TaskBlock({
  task,
  theme,
  isCurrent,
  dragOffset,
  lane,
  laneCount,
  selectMode,
  selected,
  onPointerDownMove,
  onPointerDownResize,
  onDuplicate,
  onDelete,
  onToggleDone,
}: TaskBlockProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const color = taskColor(task)
  // A finished task drops the "happening now" fill: the block is history, and
  // leaving it lit competes with whatever is actually running.
  const box = taskBoxStyle(color, theme, isCurrent && !task.done)
  const top = minutesToTopPx(task.startMinute)
  let height = durationToHeightPx(task.durationMinute)
  let transform: string | undefined

  if (dragOffset) {
    if (dragOffset.mode === 'resize') height = Math.max(14, height + dragOffset.dyPx)
    else transform = `translate(${dragOffset.dxPx}px, ${dragOffset.dyPx}px)`
  }

  // Overlapping tasks split the day column between them. Each lane keeps the
  // 4px inset the full-width block always had, minus a gutter between
  // neighbours so two same-colour blocks don't read as one. At laneCount 1
  // this resolves to the original `left: 4px; width: calc(100% - 8px)`.
  const isSplit = laneCount > 1
  const laneWidth = `((100% - 8px) / ${laneCount})`
  const laneLeft = `calc(4px + ${laneWidth} * ${lane})`
  const laneBoxWidth = `calc(${laneWidth} - ${lane < laneCount - 1 ? LANE_GUTTER_PX : 0}px)`

  const endMinute = task.startMinute + task.durationMinute
  const showTime = task.durationMinute >= 45
  const isDragging = !!dragOffset

  // Read-only note preview that fills the empty space in a tall block. Editing
  // and checking off still happens in TaskNotePopover — a tap opens it. We only
  // draw as many lines as fit above the resize handle, so a short block shows
  // nothing rather than a clipped half-line.
  const NOTE_LINE_PX = 15
  const reservedTopPx = 6 + 16 + (showTime ? 16 : 0) + 4
  const availableNotePx = height - reservedTopPx - 14
  const maxNoteLines = Math.floor(availableNotePx / NOTE_LINE_PX)
  let visibleNotes = task.notes.slice(0, Math.max(0, maxNoteLines))
  let hiddenNoteCount = task.notes.length - visibleNotes.length
  // Give up a line to the "+N" counter so it never itself overflows.
  if (hiddenNoteCount > 0 && visibleNotes.length > 0) {
    visibleNotes = visibleNotes.slice(0, -1)
    hiddenNoteCount = task.notes.length - visibleNotes.length
  }
  const showNotes = maxNoteLines >= 1 && visibleNotes.length > 0

  const blockProps = {
    'data-task-block': true,
    onPointerDown: onPointerDownMove,
    onClick: (e: ReactMouseEvent) => e.stopPropagation(),
    className: `animate-[sched-fade_220ms_ease] absolute overflow-hidden rounded-[14px] py-1.5 pr-2 select-none ${
      isSplit ? 'pl-2' : 'pl-3'
    }`,
    style: {
      top,
      left: laneLeft,
      width: laneBoxWidth,
      height: Math.max(height - 2, 12),
      background: box.bg,
      color: box.fg,
      border: box.border,
      boxShadow: isDragging
        ? '0 16px 34px rgba(0,0,0,0.3)'
        : selected
          ? `0 0 0 2px ${theme.accent}, ${box.shadow}`
          : box.shadow,
      opacity: task.done ? (selectMode && !selected ? 0.45 : 0.6) : selectMode && !selected ? 0.75 : 1,
      cursor: isDragging ? 'grabbing' : 'grab',
      zIndex: isDragging ? 40 : 10,
      transform,
      // Idle: let a touch pass through to the page's vertical scroll —
      // useTaskDragResize only claims the gesture after its long-press
      // fires. Active: lock it down so the drag doesn't fight scrolling.
      touchAction: isDragging ? 'none' : 'pan-y',
      // Disabled mid-drag so the block tracks the pointer 1:1; once
      // dropped, it glides from the drag offset to its snapped position
      // instead of jumping there.
      transition: isDragging
        ? 'none'
        : 'top 180ms cubic-bezier(.2,.8,.2,1), left 180ms cubic-bezier(.2,.8,.2,1), width 180ms cubic-bezier(.2,.8,.2,1), height 180ms cubic-bezier(.2,.8,.2,1), transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease',
    },
  }

  const blockContent = (
    <>
      <div
        className="absolute top-0 bottom-0 left-0 w-1 rounded-l-[5px]"
        style={{ background: color }}
      />
      <div className="flex min-w-0 items-center gap-1.5">
        {/* Inline rather than a corner badge so it can't overlap the title in a
            narrow lane, and so the check survives every block width. */}
        {task.done && <CheckIcon className="size-3 flex-shrink-0" strokeWidth={4} />}
        <span className="flex-shrink-0 text-[13px] leading-none">{task.categoryEmoji}</span>
        <div className={`truncate text-[12.5px] leading-tight font-bold ${task.done ? 'line-through' : ''}`}>
          {task.title}
        </div>
      </div>
      {showTime && (
        <div className="mt-0.5 truncate text-[11px] font-semibold opacity-[.82]">
          {formatMinutesAsTime(task.startMinute)} – {formatMinutesAsTime(endMinute)}
        </div>
      )}
      {showNotes && (
        <div className="mt-1 min-w-0" style={{ pointerEvents: 'none' }}>
          {visibleNotes.map((noteItem) => (
            <div
              key={noteItem.id}
              className="flex items-center gap-1 text-[10.5px] leading-[15px]"
            >
              <span className="flex-shrink-0" style={{ opacity: 0.6 }}>
                {noteItem.done ? '✓' : '•'}
              </span>
              <span
                className={`min-w-0 truncate ${noteItem.done ? 'line-through' : ''}`}
                style={{ opacity: noteItem.done ? 0.5 : 0.85 }}
              >
                {noteItem.text}
              </span>
            </div>
          ))}
          {hiddenNoteCount > 0 && (
            <div className="text-[10px] leading-[15px] font-semibold" style={{ opacity: 0.55 }}>
              +{hiddenNoteCount}
            </div>
          )}
        </div>
      )}
      {selectMode ? (
        <div
          className="absolute top-1.5 right-1.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
          style={{
            borderColor: box.fg,
            background: selected ? box.fg : 'transparent',
          }}
        >
          {selected && <CheckIcon className="size-3" style={{ color: box.bg }} />}
        </div>
      ) : (
        <div
          onPointerDown={(e) => {
            e.stopPropagation()
            onPointerDownResize(e)
          }}
          className="absolute inset-x-0 bottom-0 flex h-[22px] cursor-ns-resize items-end justify-center pb-1"
          style={{ touchAction: isDragging ? 'none' : 'pan-y' }}
        >
          <div className="h-[3px] w-8 rounded-full opacity-45" style={{ background: box.fg }} />
        </div>
      )}
    </>
  )

  // No context menu on mobile or while multi-selecting: a touch long-press
  // fires the browser's contextmenu event, which would pop this menu *on
  // top of* the action sheet the same hold already opens (see
  // useTaskDragResize's onLongPressTask) — two overlapping menus for one
  // gesture. In select mode the context menu's duplicate/delete actions
  // would also bypass the selection entirely, so it's suppressed there too.
  if (isMobile || selectMode) return <div {...blockProps}>{blockContent}</div>

  return (
    <ContextMenu>
      <ContextMenuTrigger {...blockProps}>{blockContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone()
          }}
        >
          {task.done ? t.markNotDone : t.markDone}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate()
          }}
        >
          {t.duplicate}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          {t.delete}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
