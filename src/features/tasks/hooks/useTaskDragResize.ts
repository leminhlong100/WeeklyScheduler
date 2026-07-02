import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import type { Dayjs } from 'dayjs'
import { clampDurationMinute, clampStartMinute, pxDeltaToSnappedMinutes } from '../utils/gridMath'

export type DragMode = 'move' | 'resize'

const DOUBLE_CLICK_MS = 400

export interface TaskOrigin {
  dayIndex: number
  startMinute: number
  durationMinute: number
}

export interface DragPreview {
  id: string
  mode: DragMode
  dxPx: number
  dyPx: number
}

interface DragState extends TaskOrigin {
  id: string
  mode: DragMode
  pointerStartX: number
  pointerStartY: number
  moved: boolean
}

interface UseTaskDragResizeOptions {
  weekStart: Dayjs
  snapMinutes: number
  gridRef: RefObject<HTMLDivElement | null>
  /** Number of day columns spanning `gridRef`'s width — used to translate horizontal drag distance into a day change. */
  columns?: number
  /** When true, dragging never changes which day a task belongs to (e.g. a single-day mobile view has nowhere to drag it to). */
  lockDay?: boolean
  getTaskOrigin: (id: string) => TaskOrigin | undefined
  onMove: (id: string, next: { dayIndex: number; startMinute: number }) => void
  onResize: (id: string, next: { durationMinute: number }) => void
  onClickTask: (id: string) => void
  onDoubleClickTask: (id: string) => void
}

/**
 * Pointer-based drag (move across day/time) and resize (duration) for task
 * blocks. Mirrors the design's global-pointer approach: a single set of
 * window listeners tracks the active drag, and a `preview` offset is
 * rendered as a CSS transform until pointer-up commits the final value.
 */
export function useTaskDragResize({
  weekStart,
  snapMinutes,
  gridRef,
  columns = 7,
  lockDay = false,
  getTaskOrigin,
  onMove,
  onResize,
  onClickTask,
  onDoubleClickTask,
}: UseTaskDragResizeOptions) {
  const [preview, setPreview] = useState<DragPreview | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)
  const pendingClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // "Latest ref" pattern: the window listeners below are attached once, so
  // they read these refs (kept fresh via effect, not during render) instead
  // of stale closures over `onMove`/`onResize`/`onClickTask`/`onDoubleClickTask`.
  const snapRef = useRef(snapMinutes)
  const columnsRef = useRef(columns)
  const lockDayRef = useRef(lockDay)
  const onMoveRef = useRef(onMove)
  const onResizeRef = useRef(onResize)
  const onClickRef = useRef(onClickTask)
  const onDoubleClickRef = useRef(onDoubleClickTask)
  void weekStart // week boundary changes remount the grid, which resets any in-flight drag anyway

  useEffect(() => {
    snapRef.current = snapMinutes
    columnsRef.current = columns
    lockDayRef.current = lockDay
    onMoveRef.current = onMove
    onResizeRef.current = onResize
    onClickRef.current = onClickTask
    onDoubleClickRef.current = onDoubleClickTask
  }, [snapMinutes, columns, lockDay, onMove, onResize, onClickTask, onDoubleClickTask])

  useEffect(() => {
    return () => {
      if (pendingClickTimeoutRef.current) clearTimeout(pendingClickTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    function handleMove(e: globalThis.PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const dxPx = e.clientX - drag.pointerStartX
      const dyPx = e.clientY - drag.pointerStartY
      if (Math.abs(dxPx) > 4 || Math.abs(dyPx) > 4) drag.moved = true
      if (drag.moved) setPreview({ id: drag.id, mode: drag.mode, dxPx, dyPx })
    }

    function handleUp(e: globalThis.PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      setPreview(null)

      if (!drag.moved) {
        const now = Date.now()
        const last = lastClickRef.current
        if (last && last.id === drag.id && now - last.time < DOUBLE_CLICK_MS) {
          lastClickRef.current = null
          if (pendingClickTimeoutRef.current) {
            clearTimeout(pendingClickTimeoutRef.current)
            pendingClickTimeoutRef.current = null
          }
          onDoubleClickRef.current(drag.id)
        } else {
          lastClickRef.current = { id: drag.id, time: now }
          pendingClickTimeoutRef.current = setTimeout(() => {
            pendingClickTimeoutRef.current = null
            onClickRef.current(drag.id)
          }, DOUBLE_CLICK_MS)
        }
        return
      }

      const dxPx = e.clientX - drag.pointerStartX
      const dyPx = e.clientY - drag.pointerStartY
      const deltaMinutes = pxDeltaToSnappedMinutes(dyPx, snapRef.current)

      if (drag.mode === 'resize') {
        const durationMinute = clampDurationMinute(drag.durationMinute + deltaMinutes, drag.startMinute)
        onResizeRef.current(drag.id, { durationMinute })
        return
      }

      let dayIndex = drag.dayIndex
      if (!lockDayRef.current) {
        const gridEl = gridRef.current
        const colWidth = gridEl ? gridEl.getBoundingClientRect().width / columnsRef.current : 1
        const dayDelta = Math.round(dxPx / colWidth)
        dayIndex = Math.max(0, Math.min(6, drag.dayIndex + dayDelta))
      }
      const startMinute = clampStartMinute(drag.startMinute + deltaMinutes, drag.durationMinute)
      onMoveRef.current(drag.id, { dayIndex, startMinute })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [gridRef])

  const startDrag = useCallback(
    (e: PointerEvent, id: string, mode: DragMode) => {
      // Right/middle mouse buttons shouldn't start a move/resize drag or
      // count as a click-to-edit — right click opens the context menu instead.
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.stopPropagation()
      const origin = getTaskOrigin(id)
      if (!origin) return
      dragRef.current = {
        id,
        mode,
        pointerStartX: e.clientX,
        pointerStartY: e.clientY,
        moved: false,
        ...origin,
      }
    },
    [getTaskOrigin],
  )

  return { preview, startDrag }
}
