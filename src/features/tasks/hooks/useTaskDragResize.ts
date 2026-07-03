import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import type { Dayjs } from 'dayjs'
import { clampDurationMinute, clampStartMinute, pxDeltaToSnappedMinutes } from '../utils/gridMath'

export type DragMode = 'move' | 'resize'

const DOUBLE_CLICK_MS = 400
/** How long a touch must be held before it picks up a task, instead of scrolling the page. */
const LONG_PRESS_MS = 350
/** Movement (px) during the long-press wait that cancels pickup and lets the gesture scroll instead. */
const PENDING_CANCEL_PX = 10

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
  pointerType: string
}

interface PendingLongPress {
  id: string
  mode: DragMode
  pointerStartX: number
  pointerStartY: number
  origin: TaskOrigin
  timer: ReturnType<typeof setTimeout>
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
  /** Touch only: the press was held past the long-press threshold but released without dragging — opens the action menu instead of the tap action. */
  onLongPressTask: (id: string) => void
  onDoubleClickTask: (id: string) => void
}

/**
 * Pointer-based drag (move across day/time) and resize (duration) for task
 * blocks. Mirrors the design's global-pointer approach: a single set of
 * window listeners tracks the active drag, and a `preview` offset is
 * rendered as a CSS transform until pointer-up commits the final value.
 *
 * Touch pointers get an extra pickup step: a finger down on a task doesn't
 * grab it immediately (that would fight the page's vertical scroll) — it
 * only activates after a short long-press, and cancels back to a plain tap
 * if the finger moves before then. Mouse/pen keep the original
 * immediate-drag behavior, including the click/double-click timing.
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
  onLongPressTask,
  onDoubleClickTask,
}: UseTaskDragResizeOptions) {
  const [preview, setPreview] = useState<DragPreview | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const pendingRef = useRef<PendingLongPress | null>(null)
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
  const onLongPressRef = useRef(onLongPressTask)
  const onDoubleClickRef = useRef(onDoubleClickTask)
  void weekStart // week boundary changes remount the grid, which resets any in-flight drag anyway

  useEffect(() => {
    snapRef.current = snapMinutes
    columnsRef.current = columns
    lockDayRef.current = lockDay
    onMoveRef.current = onMove
    onResizeRef.current = onResize
    onClickRef.current = onClickTask
    onLongPressRef.current = onLongPressTask
    onDoubleClickRef.current = onDoubleClickTask
  }, [snapMinutes, columns, lockDay, onMove, onResize, onClickTask, onLongPressTask, onDoubleClickTask])

  const clearPending = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer)
      pendingRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pendingClickTimeoutRef.current) clearTimeout(pendingClickTimeoutRef.current)
      clearPending()
    }
  }, [clearPending])

  useEffect(() => {
    function handleMove(e: globalThis.PointerEvent) {
      const pending = pendingRef.current
      if (pending) {
        const dx = e.clientX - pending.pointerStartX
        const dy = e.clientY - pending.pointerStartY
        if (Math.abs(dx) > PENDING_CANCEL_PX || Math.abs(dy) > PENDING_CANCEL_PX) clearPending()
        return
      }

      const drag = dragRef.current
      if (!drag) return
      const dxPx = e.clientX - drag.pointerStartX
      const dyPx = e.clientY - drag.pointerStartY
      if (Math.abs(dxPx) > 4 || Math.abs(dyPx) > 4) drag.moved = true
      if (drag.moved) setPreview({ id: drag.id, mode: drag.mode, dxPx, dyPx })
    }

    function handleUp(e: globalThis.PointerEvent) {
      const pending = pendingRef.current
      if (pending) {
        // Released before the long-press fired — a plain tap, not a drag.
        clearPending()
        onClickRef.current(pending.id)
        return
      }

      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      setPreview(null)

      if (!drag.moved) {
        if (drag.pointerType === 'touch') {
          // Reaching here means the long-press timer already fired (that's
          // the only way touch ever gets a dragRef) but the finger never
          // moved — so this is a deliberate hold-and-release, not a tap.
          // Opens the action menu instead of re-triggering the tap action.
          onLongPressRef.current(drag.id)
          return
        }
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

    function handleCancel() {
      clearPending()
      dragRef.current = null
      setPreview(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
    }
  }, [gridRef, clearPending])

  const startDrag = useCallback(
    (e: PointerEvent, id: string, mode: DragMode) => {
      // Right/middle mouse buttons shouldn't start a move/resize drag or
      // count as a click-to-edit — right click opens the context menu instead.
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const origin = getTaskOrigin(id)
      if (!origin) return

      if (e.pointerType === 'touch') {
        // Don't stopPropagation/preventDefault here — until the long-press
        // fires, the gesture should still behave like a normal page scroll.
        const pointerStartX = e.clientX
        const pointerStartY = e.clientY
        clearPending()
        pendingRef.current = {
          id,
          mode,
          pointerStartX,
          pointerStartY,
          origin,
          timer: setTimeout(() => {
            const pending = pendingRef.current
            if (pending && pending.id === id) {
              pendingRef.current = null
              dragRef.current = {
                id: pending.id,
                mode: pending.mode,
                pointerStartX: pending.pointerStartX,
                pointerStartY: pending.pointerStartY,
                moved: false,
                pointerType: 'touch',
                ...pending.origin,
              }
              navigator.vibrate?.(15)
              setPreview({ id: pending.id, mode: pending.mode, dxPx: 0, dyPx: 0 })
            }
          }, LONG_PRESS_MS),
        }
        return
      }

      e.stopPropagation()
      dragRef.current = {
        id,
        mode,
        pointerStartX: e.clientX,
        pointerStartY: e.clientY,
        moved: false,
        pointerType: e.pointerType,
        ...origin,
      }
    },
    [getTaskOrigin, clearPending],
  )

  return { preview, startDrag }
}
