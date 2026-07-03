import type { PointerEvent } from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import type { DerivedTheme } from '@/features/theme/types'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { formatMinutesAsTime } from '@/lib/utils/date'
import { durationToHeightPx, minutesToTopPx } from '../utils/gridMath'
import { taskBoxStyle } from '../utils/taskBoxStyle'
import type { TaskWithCategory } from '../types'
import type { DragMode } from '../hooks/useTaskDragResize'

interface TaskBlockProps {
  task: TaskWithCategory
  theme: DerivedTheme
  isCurrent: boolean
  dragOffset: { dxPx: number; dyPx: number; mode: DragMode } | null
  onPointerDownMove: (e: PointerEvent) => void
  onPointerDownResize: (e: PointerEvent) => void
  onDuplicate: () => void
  onDelete: () => void
}

export function TaskBlock({
  task,
  theme,
  isCurrent,
  dragOffset,
  onPointerDownMove,
  onPointerDownResize,
  onDuplicate,
  onDelete,
}: TaskBlockProps) {
  const { t } = useTranslation()
  const box = taskBoxStyle(task.categoryColor, theme, isCurrent)
  const top = minutesToTopPx(task.startMinute)
  let height = durationToHeightPx(task.durationMinute)
  let transform: string | undefined

  if (dragOffset) {
    if (dragOffset.mode === 'resize') height = Math.max(14, height + dragOffset.dyPx)
    else transform = `translate(${dragOffset.dxPx}px, ${dragOffset.dyPx}px)`
  }

  const endMinute = task.startMinute + task.durationMinute
  const showTime = task.durationMinute >= 45
  const isDragging = !!dragOffset

  return (
    <ContextMenu>
      <ContextMenuTrigger
        data-task-block
        onPointerDown={onPointerDownMove}
        onClick={(e) => e.stopPropagation()}
        className="animate-[sched-fade_220ms_ease] absolute right-1 left-1 overflow-hidden rounded-[14px] py-1.5 pr-2 pl-3 select-none"
        style={{
          top,
          height: Math.max(height - 2, 12),
          background: box.bg,
          color: box.fg,
          border: box.border,
          boxShadow: isDragging ? '0 16px 34px rgba(0,0,0,0.3)' : box.shadow,
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
            : 'top 180ms cubic-bezier(.2,.8,.2,1), height 180ms cubic-bezier(.2,.8,.2,1), transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease',
        }}
      >
        <div
          className="absolute top-0 bottom-0 left-0 w-1 rounded-l-[5px]"
          style={{ background: task.categoryColor }}
        />
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex-shrink-0 text-[13px] leading-none">{task.categoryEmoji}</span>
          <div className="truncate text-[12.5px] leading-tight font-bold">{task.title}</div>
        </div>
        {showTime && (
          <div className="mt-0.5 text-[11px] font-semibold opacity-[.82]">
            {formatMinutesAsTime(task.startMinute)} – {formatMinutesAsTime(endMinute)}
          </div>
        )}
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
      </ContextMenuTrigger>
      <ContextMenuContent>
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
