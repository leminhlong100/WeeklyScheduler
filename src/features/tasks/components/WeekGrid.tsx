import { useMemo, useRef } from 'react'
import type { Dayjs } from 'dayjs'
import type { DerivedTheme } from '@/features/theme/types'
import type { Dictionary } from '@/features/i18n/dictionary'
import { addDays, parseISODate, todayISO as getTodayISO, toISODate } from '@/lib/utils/date'
import { CREATE_SNAP_MINUTES, DEFAULT_SNAP_MINUTES, GRID_END_MINUTE, GRID_START_MINUTE, HOUR_HEIGHT_PX } from '@/constants/grid'
import type { Category } from '@/features/categories/api/categoriesApi'
import type { Task } from '../api/tasksApi'
import { useUpdateTask } from '../hooks/useTaskMutations'
import { useTaskDragResize, type TaskOrigin } from '../hooks/useTaskDragResize'
import { useNowMinutes } from '../hooks/useNowMinutes'
import { minutesToTopPx } from '../utils/gridMath'
import { UNCATEGORIZED_COLOR, UNCATEGORIZED_EMOJI, type TaskWithCategory } from '../types'
import { HourRuler } from './HourRuler'
import { DayHeaderRow, type DayHeaderInfo } from './DayHeaderRow'
import { DayColumn } from './DayColumn'

interface WeekGridProps {
  weekStart: Dayjs
  tasks: Task[]
  categories: Category[]
  isCategoryActive: (categoryId: string) => boolean
  theme: DerivedTheme
  t: Dictionary
  onRequestCreate: (taskDate: string, startMinute: number) => void
  onRequestEdit: (taskId: string) => void
}

export function WeekGrid({
  weekStart,
  tasks,
  categories,
  isCategoryActive,
  theme,
  t,
  onRequestCreate,
  onRequestEdit,
}: WeekGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const nowMinutes = useNowMinutes()
  const todayISO = getTodayISO()
  const updateTask = useUpdateTask(toISODate(weekStart))

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const days = useMemo<DayHeaderInfo[]>(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const iso = toISODate(date)
      return { key: iso, dow: t.dow[i], dayNum: date.date(), isToday: iso === todayISO }
    })
  }, [weekStart, t.dow, todayISO])

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
    onClickTask: onRequestEdit,
  })

  const handleCreateAt = (dayIndex: number, clientY: number, boundingTop: number) => {
    const y = clientY - boundingTop
    let minute =
      GRID_START_MINUTE + Math.round((y / HOUR_HEIGHT_PX / CREATE_SNAP_MINUTES) * 60) * CREATE_SNAP_MINUTES
    minute = Math.max(GRID_START_MINUTE, Math.min(minute, GRID_END_MINUTE - 60))
    onRequestCreate(toISODate(addDays(weekStart, dayIndex)), minute)
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
              nowTopPx={day.isToday ? minutesToTopPx(nowMinutes) : null}
              dragPreview={preview}
              onCreateAt={(clientY, boundingTop) => handleCreateAt(dayIndex, clientY, boundingTop)}
              onStartDrag={startDrag}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
