/**
 * Mã mời đang chờ, khi người được mời mở link `/join/<mã>` lúc CHƯA đăng nhập.
 *
 * Đăng nhập bằng form, bằng Google (OAuth chuyển hẳn sang trang khác) hay đăng
 * ký rồi xác nhận email đều kết thúc ở một trang có `ProtectedRoute`; route đó
 * thấy mã còn chờ thì đưa người dùng quay lại `/join/<mã>`. Lưu ở localStorage
 * vì OAuth và link xác nhận email làm mất sessionStorage của tab cũ.
 */
const KEY = 'weekly-scheduler:pending-join'

export function savePendingJoin(code: string) {
  try {
    window.localStorage.setItem(KEY, code)
  } catch {
    // Storage bị chặn: người dùng mở lại link sau khi đăng nhập là được.
  }
}

export function clearPendingJoin() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // bỏ qua
  }
}

export function pendingJoinPath(): string | null {
  try {
    const code = window.localStorage.getItem(KEY)
    return code ? `/join/${encodeURIComponent(code)}` : null
  } catch {
    return null
  }
}
