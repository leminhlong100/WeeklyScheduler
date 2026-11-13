/** Rung rất ngắn — đủ để biết "đã lưu", không đủ để thành phiền. */
export const HAPTIC_SUCCESS_MS = 12

/**
 * Rung nhẹ báo thao tác đã thành công (Android). iOS Safari không có
 * `navigator.vibrate`: gọi tới thì không làm gì và không lỗi. Chỉ gọi khi lưu
 * thành công, không gọi khi lỗi.
 *
 * Nhận `nav` để test được; mặc định là `navigator` của trình duyệt.
 */
export function haptic(
  nav: Pick<Navigator, 'vibrate'> | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator,
): void {
  try {
    nav?.vibrate?.(HAPTIC_SUCCESS_MS)
  } catch {
    // Một số trình duyệt ném lỗi khi trang chưa có thao tác chạm nào: bỏ qua.
  }
}
