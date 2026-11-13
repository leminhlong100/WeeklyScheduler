import { useEffect, useState } from 'react'
import { isKeyboardLikelyOpen, isTextEntry } from '@/lib/utils/viewport'

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
