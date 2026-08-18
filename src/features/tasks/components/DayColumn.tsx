import { useMemo, type PointerEvent as ReactPointerEvent } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import { gridTotalHeightPx } from '../utils/gridMath'
import { computeTaskLanes } from '../utils/layoutOverlaps'
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
  /** Omitted on mobile — the bottom bar's "+" button covers task creation there instead, since a tap on the grid is needed for viewing notes. */
  onCreateAt?: (clientY: number, boundingTop: number) => void
  onStartDrag: (e: ReactPointerEvent, id: string, mode: DragMode) => void
  onDuplicateTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onToggleDone: (id: string) => void
  onCloseNote: () => void
  onSaveNotes: (taskId: string, notes: TaskNoteItem[]) => void
  selectMode: boolean
  selectedIds: Set<string>
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
  onToggleDone,
  onCloseNote,
  onSaveNotes,
  selectMode,
  selectedIds,
}: DayColumnProps) {
  const openNoteTask = tasks.find((task) => task.id === openNoteTaskId)
  const lanes = useMemo(() => computeTaskLanes(tasks), [tasks])

  return (
    <div
      onClick={onCreateAt ? (e) => onCreateAt(e.clientY, e.currentTarget.getBoundingClientRect().top) : undefined}
      className={`relative min-w-0 flex-1 border-l${onCreateAt ? ' cursor-pointer' : ''}`}
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

        const lane = lanes.get(task.id)

        return (
          <TaskBlock
            key={task.id}
            task={task}
            theme={theme}
            isCurrent={isCurrent}
            dragOffset={dragPreview?.id === task.id ? dragPreview : null}
            lane={lane?.lane ?? 0}
            laneCount={lane?.laneCount ?? 1}
            selectMode={selectMode}
            selected={selectedIds.has(task.id)}
            onPointerDownMove={(e) => onStartDrag(e, task.id, 'move')}
            onPointerDownResize={(e) => onStartDrag(e, task.id, 'resize')}
            onDuplicate={() => onDuplicateTask(task.id)}
            onDelete={() => onDeleteTask(task.id)}
            onToggleDone={() => onToggleDone(task.id)}
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
