import type { ExpenseStatus } from '@/lib/supabase/database.types'
import { todayISO } from '@/lib/utils/date'

/**
 * Ngày còn ở tương lai thì khoản này chưa xảy ra: lưu 'planned' để nó không được
 * cộng vào tổng và số dư của tháng đó.
 *
 * Một chỗ duy nhất quyết định trạng thái lúc tạo — chuỗi định kỳ, khoản lẻ và
 * bảng nháp AI đều gọi hàm này, nên không thể lệch quy tắc nhau. So chuỗi
 * 'YYYY-MM-DD' trực tiếp là so theo lịch địa phương và không cần dựng Date.
 */
export function statusForDate(spentAt: string): ExpenseStatus {
  return spentAt > todayISO() ? 'planned' : 'paid'
}
