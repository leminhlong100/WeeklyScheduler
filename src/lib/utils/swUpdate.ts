/** Quay lại app sau ít nhất chừng này thì hỏi máy chủ có bản mới chưa. */
export const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Có nên gọi `registration.update()` lúc app vừa quay lại từ nền không.
 *
 * PWA trên điện thoại hiếm khi khởi động lại hẳn — chỉ ngủ ở nền rồi thức dậy
 * — nên trình duyệt ít khi tự kiểm bản mới. Kiểm mỗi lần quay lại thì phí mạng;
 * kiểm khi đã quá `intervalMs` kể từ lần trước là đủ. Offline thì bỏ qua (gọi
 * `update()` lúc đó chỉ ra lỗi).
 */
export function shouldCheckForUpdate(input: {
  now: number
  lastCheck: number
  online: boolean
  intervalMs?: number
}): boolean {
  const { now, lastCheck, online, intervalMs = SW_UPDATE_CHECK_INTERVAL_MS } = input
  if (!online) return false
  return now - lastCheck >= intervalMs
}
