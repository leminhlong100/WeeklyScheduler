import type { PointerEvent as ReactPointerEvent } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import { gridTotalHeightPx } from '../utils/gridMath'
import type { TaskWithCategory } from '../types'
import type { DragMode, DragPreview } from '../hooks/useTaskDragResize'
import { TaskBlock } from './TaskBlock'
import { NowIndicator } from './NowIndicator'

interface DayColumnProps {
  theme: DerivedTheme
  tasks: TaskWithCategory[]
  isToday: boolean
  nowTopPx: number | null
  dragPreview: DragPreview | null
  onCreateAt: (clientY: number, boundingTop: number) => void
  onStartDrag: (e: ReactPointerEvent, id: string, mode: DragMode) => void
  onDuplicateTask: (id: string) => void
  onDeleteTask: (id: string) => void
}

export function DayColumn({
  theme,
  tasks,
  isToday,
  nowTopPx,
  dragPreview,
  onCreateAt,
  onStartDrag,
  onDuplicateTask,
  onDeleteTask,
}: DayColumnProps) {
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

      {tasks.map((task) => (
        <TaskBlock
          key={task.id}
          task={task}
          theme={theme}
          dragOffset={dragPreview?.id === task.id ? dragPreview : null}
          onPointerDownMove={(e) => onStartDrag(e, task.id, 'move')}
          onPointerDownResize={(e) => onStartDrag(e, task.id, 'resize')}
          onDuplicate={() => onDuplicateTask(task.id)}
          onDelete={() => onDeleteTask(task.id)}
        />
      ))}
    </div>
  )
}
