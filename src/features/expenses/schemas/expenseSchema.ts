import { z } from 'zod'

export const CURRENCIES = ['VND', 'JPY', 'USD'] as const

/**
 * Đơn vị tiền mặc định của app. Cột `expense_categories.monthly_budget` là
 * numeric không kèm currency, nên hạn mức chỉ có nghĩa khi hiểu ngầm là tiền
 * mặc định — báo cáo vì thế chỉ đối chiếu hạn mức trong khối currency này.
 * Muốn đặt hạn mức cho nhiều đơn vị thì phải thêm cột currency vào bảng trước.
 */
export const DEFAULT_CURRENCY = 'VND' as const

export const expenseSchema = z.object({
  /**
   * Chuỗi chứ không phải number: `<input type="number">` trả '' khi rỗng, và
   * `valueAsNumber` biến nó thành NaN — thông báo lỗi khi đó là "Expected number,
   * received nan" thay vì "chưa nhập". Chuyển sang số ở `parseAmount`.
   */
  amount: z
    .string()
    .min(1, 'fieldRequired')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'expenseAmountPositive'),
  currency: z.enum(CURRENCIES),
  categoryId: z.string(),
  note: z.string().max(200),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fieldRequired'),
  /**
   * Số kỳ khi TẠO MỚI: 1 = khoản lẻ, >1 = chuỗi định kỳ hàng tháng. Không dùng
   * khi sửa — sửa một kỳ đã có không đổi được độ dài chuỗi.
   */
  repeatMonths: z.number().int().min(1).max(24),
})

export type ExpenseFormInput = z.infer<typeof expenseSchema>

/** Làm tròn về 2 số lẻ, khớp `numeric(14,2)` của cột `amount`. */
export function parseAmount(value: string): number {
  return Math.round(Number(value) * 100) / 100
}

/** Lựa chọn độ dài chuỗi định kỳ. Trần 24 khớp với `max(24)` của schema. */
export const REPEAT_MONTH_OPTIONS = [1, 2, 3, 6, 12, 24] as const
