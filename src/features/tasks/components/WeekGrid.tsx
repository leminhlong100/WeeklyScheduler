import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Dayjs } from 'dayjs'
import { toast } from 'sonner'
import type { DerivedTheme } from '@/features/theme/types'
import type { Dictionary } from '@/features/i18n/dictionary'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { addDays, parseISODate, todayISO as getTodayISO, toISODate } from '@/lib/utils/date'
import { CREATE_SNAP_MINUTES, DEFAULT_SNAP_MINUTES, GRID_END_MINUTE, GRID_START_MINUTE, HOUR_HEIGHT_PX } from '@/constants/grid'
import type { Category } from '@/features/categories/api/categoriesApi'
import type { Task } from '../api/tasksApi'
import { useCreateTask, useDeleteTask, useUpdateTask } from '../hooks/useTaskMutations'
import { useTaskDragResize, type TaskOrigin } from '../hooks/useTaskDragResize'
import { useNowMinutes } from '../hooks/useNowMinutes'
import { useScrollToNow } from '../hooks/useScrollToNow'
import { minutesToTopPx } from '../utils/gridMath'
import { UNCATEGORIZED_COLOR, UNCATEGORIZED_EMOJI, type TaskNoteItem, type TaskWithCategory } from '../types'
import { HourRuler } from './HourRuler'
import { DayHeaderRow, type DayHeaderInfo } from './DayHeaderRow'
import { DayColumn } from './DayColumn'
import { TaskActionSheet } from './TaskActionSheet'

/** Horizontal drag distance (px) that counts as a day-change swipe, not a scroll/tap. */
const SWIPE_THRESHOLD_PX = 55

interface WeekGridProps {
  weekStart: Dayjs
  selected: Dayjs
  tasks: Task[]
  categories: Category[]
  isCategoryActive: (categoryId: string) => boolean
  theme: DerivedTheme
  t: Dictionary
  onRequestCreate: (taskDate: string, startMinute: number) => void
  onRequestEdit: (taskId: string) => void
  /** Mobile-only: swipe left/right over the single-day grid to change day (direction: +1 = next, -1 = previous). */
  onSwipeDay?: (direction: 1 | -1) => void
}

export function WeekGrid({
  weekStart,
  selected,
  tasks,
  categories,
  isCategoryActive,
  theme,
  t,
  onRequestCreate,
  onRequestEdit,
  onSwipeDay,
}: WeekGridProps) {
  const isMobile = useIsMobile()
  const gridRef = useRef<HTMLDivElement>(null)
  const nowMinutes = useNowMinutes()
  const todayISO = getTodayISO()
  const weekStartISO = toISODate(weekStart)
  const updateTask = useUpdateTask(weekStartISO)
  const createTask = useCreateTask(weekStartISO)
  const deleteTask = useDeleteTask(weekStartISO)
  const [openNoteTaskId, setOpenNoteTaskId] = useState<string | null>(null)
  const [actionSheetTaskId, setActionSheetTaskId] = useState<string | null>(null)
  const swipeRef = useRef<{ startX: number; startY: number; onTask: boolean } | null>(null)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const days = useMemo<DayHeaderInfo[]>(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const iso = toISODate(date)
      return { key: iso, dow: t.dow[i], dayNum: date.date(), isToday: iso === todayISO }
    })
  }, [weekStart, t.dow, todayISO])

  // Keeps the mobile single-day view in sync with the mini-calendar's
  // selected day. Adjusted during render (not an effect) per React's
  // guidance for state that depends on a prop change.
  const selectedDayKey = `${selected.valueOf()}-${weekStart.valueOf()}`
  const [mobileDayIndex, setMobileDayIndex] = useState(() =>
    Math.max(0, Math.min(6, selected.diff(weekStart, 'day'))),
  )
  const [prevSelectedDayKey, setPrevSelectedDayKey] = useState(selectedDayKey)
  if (selectedDayKey !== prevSelectedDayKey) {
    setPrevSelectedDayKey(selectedDayKey)
    setMobileDayIndex(Math.max(0, Math.min(6, selected.diff(weekStart, 'day'))))
  }

  const tasksByDay = useMemo<TaskWithCategory[][]>(() => {
    const byDay: TaskWithCategory[][] = Array.from({ length: 7 }, () => [])
    for (const task of tasks) {
      if (task.category_id && !isCategoryActive(task.category_id)) continue
      const dayIndex = parseISODate(task.task_date).diff(weekStart, 'day')
      if (dayIndex < 0 || dayIndex > 6) continue
      const category = task.category_id ? categoryById.get(task.category_id) : undefined
      byDay[dayIndex].push({
        id: task.id,
        title: task.title,
        taskDate: task.task_date,
        startMinute: task.start_minute,
        durationMinute: task.duration_minute,
        categoryId: task.category_id,
        categoryEmoji: category?.emoji ?? UNCATEGORIZED_EMOJI,
        categoryColor: category?.color ?? UNCATEGORIZED_COLOR,
        notes: task.notes ?? [],
      })
    }
    return byDay.map((day) => [...day].sort((a, b) => a.startMinute - b.startMinute))
  }, [tasks, isCategoryActive, categoryById, weekStart])

  const getTaskOrigin = (id: string): TaskOrigin | undefined => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const found = tasksByDay[dayIndex].find((task) => task.id === id)
      if (found) return { dayIndex, startMinute: found.startMinute, durationMinute: found.durationMinute }
    }
    return undefined
  }

  const { preview, startDrag } = useTaskDragResize({
    weekStart,
    snapMinutes: DEFAULT_SNAP_MINUTES,
    gridRef,
    columns: isMobile ? 1 : 7,
    lockDay: isMobile,
    getTaskOrigin,
    onMove: (id, { dayIndex, startMinute }) => {
      updateTask.mutate({
        id,
        patch: { task_date: toISODate(addDays(weekStart, dayIndex)), start_minute: startMinute },
      })
    },
    onResize: (id, { durationMinute }) => {
      updateTask.mutate({ id, patch: { duration_minute: durationMinute } })
    },
    // A tap always opens the note popover — on mobile that's the one thing
    // that was hard to reach before. The action sheet (edit/duplicate/delete)
    // is reserved for a touch hold-and-release (see onLongPressTask) so it
    // doesn't compete with the note tap; desktop keeps double-click-for-edit
    // and its right-click context menu for duplicate/delete.
    onClickTask: setOpenNoteTaskId,
    onLongPressTask: setActionSheetTaskId,
    onDoubleClickTask: onRequestEdit,
  })

  const isTodayInWeek = days.some((day) => day.isToday)
  useScrollToNow(gridRef, isTodayInWeek ? minutesToTopPx(nowMinutes) : null)

  const handleDuplicateTask = (id: string) => {
    const task = tasks.find((tk) => tk.id === id)
    if (!task) return
    createTask.mutate(
      {
        title: task.title,
        categoryId: task.category_id,
        taskDate: task.task_date,
        startMinute: task.start_minute,
        durationMinute: task.duration_minute,
      },
      {
        onSuccess: () => toast.success(t.taskDuplicated),
        onError: () => toast.error(t.somethingWentWrong),
      },
    )
  }

  const handleDeleteTask = (id: string) => {
    deleteTask.mutate(id, {
      onSuccess: () => toast.success(t.taskDeleted),
      onError: () => toast.error(t.somethingWentWrong),
    })
    setOpenNoteTaskId((current) => (current === id ? null : current))
  }

  const handleSaveNotes = (taskId: string, notes: TaskNoteItem[]) => {
    updateTask.mutate({ id: taskId, patch: { notes } })
  }

  const handleCreateAt = (dayIndex: number, clientY: number, boundingTop: number) => {
    const y = clientY - boundingTop
    let minute =
      GRID_START_MINUTE + Math.round((y / HOUR_HEIGHT_PX / CREATE_SNAP_MINUTES) * 60) * CREATE_SNAP_MINUTES
    minute = Math.max(GRID_START_MINUTE, Math.min(minute, GRID_END_MINUTE - 60))
    onRequestCreate(toISODate(addDays(weekStart, dayIndex)), minute)
  }

  const actionSheetTask = actionSheetTaskId
    ? (tasksByDay.flat().find((task) => task.id === actionSheetTaskId) ?? null)
    : null

  const closeActionSheet = () => setActionSheetTaskId(null)
  const handleActionEdit = (id: string) => {
    closeActionSheet()
    onRequestEdit(id)
  }
  const handleActionDuplicate = (id: string) => {
    closeActionSheet()
    handleDuplicateTask(id)
  }
  const handleActionDelete = (id: string) => {
    closeActionSheet()
    handleDeleteTask(id)
  }

  const handleSwipeStart = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    const onTask = !!(e.target as HTMLElement).closest('[data-task-block]')
    swipeRef.current = { startX: e.clientX, startY: e.clientY, onTask }
  }
  const handleSwipeEnd = (e: ReactPointerEvent) => {
    const swipe = swipeRef.current
    swipeRef.current = null
    if (!swipe || swipe.onTask || !onSwipeDay) return
    const dx = e.clientX - swipe.startX
    const dy = e.clientY - swipe.startY
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.4) return
    onSwipeDay(dx < 0 ? 1 : -1)
  }
  const handleSwipeCancel = () => {
    swipeRef.current = null
  }

  const actionSheet = (
    <TaskActionSheet
      task={actionSheetTask}
      onClose={closeActionSheet}
      onEdit={handleActionEdit}
      onDuplicate={handleActionDuplicate}
      onDelete={handleActionDelete}
    />
  )

  if (isMobile) {
    return (
      <div>
        <div
          className="sticky top-0 z-30 flex border-b"
          style={{ background: theme.panel, borderColor: theme.borderStrong }}
        >
          <div className="w-16 flex-shrink-0" />
          <div className="flex flex-1 gap-1.5 overflow-x-auto px-2.5 py-2 scrollbar-hidden">
            {days.map((day, dayIndex) => {
              const active = dayIndex === mobileDayIndex
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setMobileDayIndex(dayIndex)}
                  className="flex flex-shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 transition-all duration-200 active:scale-95"
                  style={{
                    background: active ? theme.brandGrad : 'transparent',
                    boxShadow: active ? `0 5px 13px ${theme.brandShadow}` : 'none',
                  }}
                >
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wide transition-colors duration-200"
                    style={{ color: active ? 'rgba(255,255,255,0.85)' : theme.muted }}
                  >
                    {day.dow}
                  </span>
                  <span
                    className="font-heading text-[15px] font-extrabold transition-colors duration-200"
                    style={{ color: active ? '#fff' : day.isToday ? theme.accent : theme.text }}
                  >
                    {day.dayNum}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="relative flex">
          <HourRuler theme={theme} />
          <div
            ref={gridRef}
            className="relative min-w-0 flex-1"
            onPointerDown={handleSwipeStart}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={handleSwipeCancel}
          >
            {/* Keyed by day so switching (tap or swipe) plays a fresh fade-in
                rather than the content silently swapping underneath. */}
            <div key={mobileDayIndex} className="animate-[sched-fade_180ms_ease]">
              <DayColumn
                theme={theme}
                tasks={tasksByDay[mobileDayIndex]}
                isToday={days[mobileDayIndex].isToday}
                dayIndex={mobileDayIndex}
                nowMinutes={days[mobileDayIndex].isToday ? nowMinutes : null}
                nowTopPx={days[mobileDayIndex].isToday ? minutesToTopPx(nowMinutes) : null}
                dragPreview={preview}
                openNoteTaskId={openNoteTaskId}
                onStartDrag={startDrag}
                onDuplicateTask={handleDuplicateTask}
                onDeleteTask={handleDeleteTask}
                onCloseNote={() => setOpenNoteTaskId(null)}
                onSaveNotes={handleSaveNotes}
              />
            </div>
          </div>
        </div>
        {actionSheet}
      </div>
    )
  }

  return (
    <div className="min-w-[880px]">
      <DayHeaderRow days={days} theme={theme} />
      <div className="relative flex">
        <HourRuler theme={theme} />
        <div ref={gridRef} className="flex flex-1">
          {days.map((day, dayIndex) => (
            <DayColumn
              key={day.key}
              theme={theme}
              tasks={tasksByDay[dayIndex]}
              isToday={day.isToday}
              dayIndex={dayIndex}
              nowMinutes={day.isToday ? nowMinutes : null}
              nowTopPx={day.isToday ? minutesToTopPx(nowMinutes) : null}
              dragPreview={preview}
              openNoteTaskId={openNoteTaskId}
              onCreateAt={(clientY, boundingTop) => handleCreateAt(dayIndex, clientY, boundingTop)}
              onStartDrag={startDrag}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onCloseNote={() => setOpenNoteTaskId(null)}
              onSaveNotes={handleSaveNotes}
            />
          ))}
        </div>
      </div>
      {actionSheet}
    </div>
  )
}
