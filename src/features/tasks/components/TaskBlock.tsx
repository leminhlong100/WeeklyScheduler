import type { PointerEvent } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import { formatMinutesAsTime } from '@/lib/utils/date'
import { durationToHeightPx, minutesToTopPx } from '../utils/gridMath'
import { taskBoxStyle } from '../utils/taskBoxStyle'
import type { TaskWithCategory } from '../types'
import type { DragMode } from '../hooks/useTaskDragResize'

interface TaskBlockProps {
  task: TaskWithCategory
  theme: DerivedTheme
  dragOffset: { dxPx: number; dyPx: number; mode: DragMode } | null
  onPointerDownMove: (e: PointerEvent) => void
  onPointerDownResize: (e: PointerEvent) => void
}

export function TaskBlock({ task, theme, dragOffset, onPointerDownMove, onPointerDownResize }: TaskBlockProps) {
  const box = taskBoxStyle(task.categoryColor, theme)
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
    <div
      onPointerDown={onPointerDownMove}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-1 left-1 touch-none overflow-hidden rounded-[14px] py-1.5 pr-2 pl-3 select-none"
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
        className="absolute inset-x-0 bottom-0 h-[9px] cursor-ns-resize"
      />
    </div>
  )
}
