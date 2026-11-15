/** `ledger_id → số yêu cầu nạp đang chờ`. Object thường, KHÔNG phải Map: xem `pendingCountFor`. */
export type PendingDepositCounts = Record<string, number>

/**
 * Đọc số đang chờ của một sổ từ dữ liệu query. Kết quả query được persist qua
 * JSON, nên trước đây (khi còn là `Map`) bản cache khôi phục thành `{}` và
 * `.get()` làm sập cả trang Chi tiêu. Đọc phòng thủ: bản cache cũ hay dữ liệu
 * lạ đều về 0 thay vì crash.
 */
export function pendingCountFor(counts: unknown, ledgerId: string): number {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) return 0
  const n = (counts as Record<string, unknown>)[ledgerId]
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
}
