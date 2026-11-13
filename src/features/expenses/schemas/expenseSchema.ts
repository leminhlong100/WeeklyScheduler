import { z } from 'zod'
import type { Currency, ExpenseKind } from '@/lib/supabase/database.types'
import { parseMoneyInput } from '@/lib/utils/parseMoneyInput'

export const CURRENCIES = ['VND', 'JPY', 'USD'] as const

/** Thứ tự cố định để bộ chọn "Chi / Thu" không đổi vị trí giữa các lần render. */
export const KINDS = ['expense', 'income'] as const satisfies readonly ExpenseKind[]

/**
 * Đơn vị tiền mặc định của app. Cột `expense_categories.monthly_budget` là
 * numeric không kèm currency, nên hạn mức chỉ có nghĩa khi hiểu ngầm là tiền
 * mặc định — báo cáo vì thế chỉ đối chiếu hạn mức trong khối currency này.
 * Muốn đặt hạn mức cho nhiều đơn vị thì phải thêm cột currency vào bảng trước.
 */
export const DEFAULT_CURRENCY = 'VND' as const

export const expenseSchema = z.object({
  /**
   * Chuỗi do `<MoneyInput>` đẩy ra: chuỗi số thô ("30000") khi đọc được, hoặc
   * nguyên chữ người dùng gõ khi chưa đọc được. Kiểm tra thật nằm ở
   * `superRefine` bên dưới vì quy tắc phụ thuộc `currency` (VND/JPY không có
   * số lẻ). Chuyển sang số ở `parseAmount`.
   */
  amount: z.string().min(1, 'fieldRequired'),
  currency: z.enum(CURRENCIES),
  /**
   * Tiền ra hay tiền vào. `amount` vẫn dương ở cả hai — dấu nằm ở đây, nên
   * không chỗ nào phải nhớ quy ước dấu khi cộng tổng.
   */
  kind: z.enum(KINDS),
  categoryId: z.string(),
  note: z.string().max(200, 'fieldTooLong'),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fieldRequired'),
  /**
   * Số kỳ khi TẠO MỚI: 1 = khoản lẻ, >1 = chuỗi định kỳ hàng tháng. Không dùng
   * khi sửa — sửa một kỳ đã có không đổi được độ dài chuỗi.
   */
  repeatMonths: z.number().int().min(1).max(24),
}).superRefine((v, ctx) => {
  const message = amountErrorKey(v.amount, v.currency)
  if (message && v.amount !== '') ctx.addIssue({ code: 'custom', path: ['amount'], message })
})

export type ExpenseFormInput = z.infer<typeof expenseSchema>

/**
 * Key lỗi i18n cho một ô tiền, `null` khi hợp lệ. Dùng chung cho form tay,
 * bảng nháp AI (đánh dấu từng dòng) và ô hạn mức.
 */
export function amountErrorKey(
  value: string,
  currency: Currency,
): 'fieldRequired' | 'expenseAmountPositive' | 'expenseAmountWhole' | 'expenseAmountTooLarge' | null {
  if (value.trim() === '') return 'fieldRequired'
  const r = parseMoneyInput(value, currency)
  if (r.ok) return null
  return r.error === 'whole'
    ? 'expenseAmountWhole'
    : r.error === 'tooLarge'
      ? 'expenseAmountTooLarge'
      : 'expenseAmountPositive'
}

/** Số tiền để ghi DB, khớp `numeric(14,2)`. NaN nếu không đọc được (schema đã chặn trước). */
export function parseAmount(value: string, currency: Currency): number {
  const r = parseMoneyInput(value, currency)
  return r.ok ? r.value : Number.NaN
}

/** Lựa chọn độ dài chuỗi định kỳ. Trần 24 khớp với `max(24)` của schema. */
export const REPEAT_MONTH_OPTIONS = [1, 2, 3, 6, 12, 24] as const
