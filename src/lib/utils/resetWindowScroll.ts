import { isTextEntry } from './viewport'

/**
 * iOS (Safari lẫn PWA) cuộn cả `window` lên để ô đang gõ không bị bàn phím che.
 * Bàn phím đóng rồi nó KHÔNG cuộn về, nên khung app cao 100dvh bị đẩy lên và để
 * lại một dải trắng ở đáy màn hình — tới khi người dùng kéo trang về tay.
 *
 * App không bao giờ cần `window` cuộn (mọi thứ cuộn bên trong khung), nên hễ bàn
 * phím đóng mà `window` còn lệch thì kéo về 0. Trang nào thật sự cao hơn màn hình
 * (vd. trang đăng nhập trên máy nhỏ) thì để yên.
 */
export function installWindowScrollReset() {
  const vv = window.visualViewport
  let timer = 0

  const reset = () => {
    if (isTextEntry(document.activeElement as HTMLInputElement | null)) return
    if (window.scrollY === 0 && window.scrollX === 0) return
    const root = document.documentElement
    if (root.scrollHeight > window.innerHeight + 1) return
    window.scrollTo(0, 0)
  }

  // Rời ô này sang ô khác: `focusout` đến trước `focusin`. Đợi bàn phím đóng
  // hẳn (iOS animate ~250ms) rồi mới xem.
  const resetSoon = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(reset, 300)
  }

  document.addEventListener('focusout', resetSoon)
  vv?.addEventListener('resize', resetSoon)
  window.addEventListener('orientationchange', resetSoon)
  // Quay lại app từ nền (PWA) cũng có lúc còn lệch.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resetSoon()
  })
}
