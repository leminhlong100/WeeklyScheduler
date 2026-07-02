import type { PointerEvent as ReactPointerEvent } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import { gridTotalHeightPx } from '../utils/gridMath'
import type { TaskNoteItem, TaskWithCategory } from '../types'
import type { DragMode, DragPreview } from '../hooks/useTaskDragResize'
import { TaskBlock } from './TaskBlock'
import { NowIndicator } from './NowIndicator'
import { TaskNotePopover } from './TaskNotePopover'

interface DayColumnProps {
  theme: DerivedTheme
  tasks: TaskWithCategory[]
  isToday: boolean
  dayIndex: number
  nowMinutes: number | null
  nowTopPx: number | null
  dragPreview: DragPreview | null
  openNoteTaskId: string | null
  onCreateAt: (clientY: number, boundingTop: number) => void
  onStartDrag: (e: ReactPointerEvent, id: string, mode: DragMode) => void
  onDuplicateTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onCloseNote: () => void
  onSaveNotes: (taskId: string, notes: TaskNoteItem[]) => void
}

export function DayColumn({
  theme,
  tasks,
  isToday,
  dayIndex,
  nowMinutes,
  nowTopPx,
  dragPreview,
  openNoteTaskId,
  onCreateAt,
  onStartDrag,
  onDuplicateTask,
  onDeleteTask,
  onCloseNote,
  onSaveNotes,
}: DayColumnProps) {
  const openNoteTask = tasks.find((task) => task.id === openNoteTaskId)

  return (
    <div
      onClick={(e) => onCreateAt(e.clientY, e.currentTarget.getBoundingClientRect().top)}
      className="relative min-w-0 flex-1 cursor-pointer border-l"
      style={{
        height: gridTotalHeightPx(),
        borderColor: theme.border,
        backgroundColor: isToday ? theme.todayTint : 'transparent',
        backgroundImage: theme.gridLinesImage,
      }}
    >
      {nowTopPx !== null && <NowIndicator topPx={nowTopPx} color={theme.nowLine} />}

      {tasks.map((task) => {
        const isCurrent =
          isToday &&
          nowMinutes !== null &&
          nowMinutes >= task.startMinute &&
          nowMinutes < task.startMinute + task.durationMinute

        return (
          <TaskBlock
            key={task.id}
            task={task}
            theme={theme}
            isCurrent={isCurrent}
            dragOffset={dragPreview?.id === task.id ? dragPreview : null}
            onPointerDownMove={(e) => onStartDrag(e, task.id, 'move')}
            onPointerDownResize={(e) => onStartDrag(e, task.id, 'resize')}
            onDuplicate={() => onDuplicateTask(task.id)}
            onDelete={() => onDeleteTask(task.id)}
          />
        )
      })}

      {openNoteTask && (
        <TaskNotePopover
          key={openNoteTask.id}
          task={openNoteTask}
          theme={theme}
          side={dayIndex >= 5 ? 'left' : 'right'}
          onClose={onCloseNote}
          onSave={(notes) => onSaveNotes(openNoteTask.id, notes)}
        />
      )}
    </div>
  )
}
