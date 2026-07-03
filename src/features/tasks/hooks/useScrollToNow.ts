import { useEffect, type RefObject } from 'react'

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null
}

/**
 * On mount, scrolls the grid's nearest scrollable ancestor so the current
 * time is comfortably in view instead of opening at the top of the day
 * (06:00). Only runs once — the live `nowTopPx` ticks every minute and
 * shouldn't yank the user's scroll position after that.
 */
export function useScrollToNow(anchorRef: RefObject<HTMLElement | null>, nowTopPx: number | null) {
  useEffect(() => {
    if (nowTopPx === null) return
    const scroller = findScrollableAncestor(anchorRef.current)
    if (!scroller) return
    scroller.scrollTop = Math.max(0, nowTopPx - scroller.clientHeight / 3)
    // Intentionally mount-only — see doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
