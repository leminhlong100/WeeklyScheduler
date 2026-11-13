import { useEffect, useState } from 'react'
import { isKeyboardLikelyOpen, isTextEntry, keyboardInset } from '@/lib/utils/viewport'

export interface VisualViewportInfo {
  /** Chiều cao phần màn hình đang thấy được (trừ bàn phím trên iOS). */
  height: number
  offsetTop: number
  /** Phần đáy layout bị bàn phím đè — chỉ khác 0 trên iOS. */
  keyboardInset: number
}

/**
 * Chỉ khi chạy dev: `?debugKbInset=320` giả một bàn phím iOS cao 320px để thử
 * bố cục trên máy tính (iOS là nơi duy nhất `keyboardInset` khác 0).
 */
function debugInset(): number {
  if (!import.meta.env.DEV) return 0
  const raw = new URLSearchParams(window.location.search).get('debugKbInset')
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) && n > 0 ? n : 0
}

function read(): VisualViewportInfo {
  const vv = window.visualViewport
  const fake = debugInset()
  const height = (vv?.height ?? window.innerHeight) - fake
  const offsetTop = vv?.offsetTop ?? 0
  return { height, offsetTop, keyboardInset: keyboardInset(window.innerHeight, height, offsetTop) }
}

const same = (a: VisualViewportInfo, b: VisualViewportInfo) =>
  Math.round(a.height) === Math.round(b.height) &&
  Math.round(a.offsetTop) === Math.round(b.offsetTop) &&
  a.keyboardInset === b.keyboardInset

/**
 * Theo dõi `visualViewport`. Trên iOS đây là cách duy nhất biết bàn phím đang
 * chiếm bao nhiêu (Safari bỏ qua `interactive-widget=resizes-content`).
 * `enabled = false` thì không gắn listener nào.
 */
export function useVisualViewport(enabled = true): VisualViewportInfo {
  const [info, setInfo] = useState<VisualViewportInfo>(read)

  useEffect(() => {
    if (!enabled) return
    const vv = window.visualViewport
    const update = () => setInfo((prev) => (same(prev, read()) ? prev : read()))
    update()
    vv?.addEventListener('resize', update)
    // iOS cuộn ngầm trang khi focus ô nhập: `offsetTop` đổi mà không có `resize`.
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return info
}

/**
 * `true` khi bàn phím ảo có vẻ đang mở (xem `isKeyboardLikelyOpen`).
 *
 * Mốc so sánh là `innerHeight` lúc không có ô nào đang gõ; đang gõ thì giữ mốc
 * cũ, nhờ vậy Android (layout co lại khi bàn phím mở) so được trước/sau.
 * Đoán sai (bàn phím vật lý, iPad) thì chỉ ảnh hưởng trong lúc đang gõ.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let baseline = window.innerHeight
    let width = window.innerWidth
    const vv = window.visualViewport

    const update = () => {
      const textFocused = isTextEntry(document.activeElement as HTMLInputElement | null)
      // Xoay máy đổi hẳn khung; lấy lại mốc.
      if (window.innerWidth !== width) {
        width = window.innerWidth
        baseline = window.innerHeight
      }
      if (!textFocused) baseline = window.innerHeight
      setOpen(
        isKeyboardLikelyOpen({
          textFocused,
          innerHeight: window.innerHeight,
          baselineHeight: baseline,
          visualViewportHeight: vv?.height ?? null,
        }),
      )
    }
    // Rời ô này sang ô khác: `focusout` đến trước `focusin` của ô mới. Đợi một
    // nhịp để khỏi tưởng bàn phím vừa đóng rồi lấy nhầm mốc lúc bàn phím còn mở.
    let timer = 0
    const updateSoon = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(update, 0)
    }

    document.addEventListener('focusin', update)
    document.addEventListener('focusout', updateSoon)
    window.addEventListener('resize', update)
    vv?.addEventListener('resize', update)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', updateSoon)
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
    }
  }, [])

  return open
}
