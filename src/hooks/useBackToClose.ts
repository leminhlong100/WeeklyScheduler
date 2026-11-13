import { useEffect, useRef } from 'react'
import {
  isLayerPopped,
  layerDepthOf,
  layerIdOf,
  layerState,
  withoutLayer,
} from '@/lib/utils/historyLayer'

/**
 * Nút Back (Android) / cử chỉ Back đóng lớp trên cùng — sheet, drawer, hộp xác
 * nhận — thay vì đổi tab phía sau hoặc thoát app.
 *
 * Cách làm: lớp mở thì `pushState` một mục cùng URL (giữ nguyên state của React
 * Router, chỉ thêm dấu lớp — xem `historyLayer.ts`). Back bật mục đó ra →
 * `popstate` → đóng lớp. Đóng bằng nút (Huỷ, Lưu, chạm nền) mà mục của lớp vẫn
 * đang ở đầu thì tự `history.back()`, để mở/đóng bao nhiêu lần cũng không để lại
 * mục thừa.
 */

/** Id các lớp đang mở và còn mục lịch sử của mình. */
const active = new Set<string>()
let seq = 0
/** Số lần `history.back()` do chính module này gọi mà chưa thấy `popstate`. */
let pendingBacks = 0
let waiters: Array<() => void> = []
let installed = false

function settle() {
  if (pendingBacks > 0) return
  const run = waiters
  waiters = []
  run.forEach((fn) => fn())
}

function goBack() {
  pendingBacks += 1
  window.history.back()
  // Phòng khi trình duyệt không bắn `popstate` (hiếm, nhưng đừng để điều hướng
  // đang chờ bị treo mãi).
  window.setTimeout(() => {
    if (pendingBacks === 0) return
    pendingBacks = 0
    settle()
  }, 1000)
}

function install() {
  if (installed) return
  installed = true
  // Tải lại trang khi đang mở sheet: mục hiện tại còn dấu của một lớp không còn
  // nữa. Gỡ dấu để lớp mở sau đó tính độ sâu từ 0.
  if (layerIdOf(window.history.state)) {
    window.history.replaceState(withoutLayer(window.history.state), '')
  }
  window.addEventListener('popstate', () => {
    if (pendingBacks > 0) pendingBacks -= 1
    // Back rơi vào mục của một lớp đã đóng (vd. lớp bị đóng vì rời trang, hoặc
    // đóng trong lúc hộp xác nhận phía trên còn chờ Back): bỏ qua luôn mục đó,
    // nếu không người dùng phải bấm Back thêm một lần mà không thấy gì đổi.
    const id = layerIdOf(window.history.state)
    if (id && !active.has(id)) {
      goBack()
      return
    }
    settle()
  })
}

/**
 * Chạy `fn` (một lệnh đổi URL) sau khi các `history.back()` của lớp đang đóng
 * đã xong. Nếu không, `setSearchParams` chạy trước `popstate` sẽ ghi đè lên mục
 * của lớp, rồi Back tới trễ lại kéo URL về giá trị cũ (vd. chọn tháng trong
 * MonthPicker: đổi tháng + đóng sheet trong cùng một cú chạm).
 */
export function whenHistorySettles(fn: () => void) {
  if (pendingBacks > 0) {
    waiters.push(fn)
    return
  }
  if (active.size > 0 && layerIdOf(window.history.state)) {
    // Đang đứng ở mục của một lớp: lớp có thể sắp đóng ngay trong lượt render
    // này (effect của nó chạy sau handler gọi tới đây). Đợi một nhịp rồi xem.
    window.setTimeout(() => (pendingBacks > 0 ? waiters.push(fn) : fn()), 0)
    return
  }
  fn()
}

interface Layer {
  id: string
  depth: number
  attached: boolean
}

export function useBackToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  const layerRef = useRef<Layer | null>(null)

  useEffect(() => {
    install()
    if (!open) return

    let layer = layerRef.current
    // StrictMode chạy effect hai lần: lần hai gặp lại lớp cũ thì không push nữa.
    if (!layer) {
      const id = `layer-${++seq}`
      const state = layerState(window.history.state, id)
      window.history.pushState(state, '')
      layer = { id, depth: layerDepthOf(state), attached: false }
      layerRef.current = layer
      active.add(id)
    }
    const current = layer
    current.attached = true

    const onPop = () => {
      if (!isLayerPopped(current.depth, window.history.state)) return
      active.delete(current.id)
      layerRef.current = null
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      current.attached = false
      // Đợi một microtask: nếu là StrictMode chạy lại effect thì lớp đã được gắn
      // lại và không làm gì. Còn đóng thật thì gỡ mục lịch sử của lớp.
      queueMicrotask(() => {
        if (current.attached || layerRef.current !== current) return
        layerRef.current = null
        active.delete(current.id)
        // Chỉ lùi khi mục của lớp vẫn ở đầu. Nếu router đã push trang khác lên
        // trên (rời trang khi drawer mở) thì để đó; `popstate` sau sẽ bỏ qua nó.
        if (layerIdOf(window.history.state) === current.id) goBack()
      })
    }
  }, [open])
}
