import { z } from 'zod'
import { parseMoneyInput } from '@/lib/utils/parseMoneyInput'
import { DEFAULT_CURRENCY, KINDS } from './expenseSchema'

export const expenseCategorySchema = z.object({
  name: z.string().min(1, 'fieldRequired').max(40, 'fieldTooLong'),
  emoji: z.string().min(1, 'fieldRequired'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'fieldRequired'),
  /**
   * Danh mục thu và danh mục chi không dùng lẫn. Chỉ chọn được lúc TẠO: đổi
   * kind của một danh mục đang có sẽ kéo theo mọi khoản đã gán nó nhảy sang phía
   * bên kia của số dư, tức sửa lại lịch sử tiền bằng một cú bấm.
   */
  kind: z.enum(KINDS),
  /**
   * Chuỗi rỗng = không đặt hạn mức, khớp với `NULL` phía DB. Số 0 không được
   * nhận: cột có check `monthly_budget is null or monthly_budget > 0`, và "0"
   * nghĩa là "không được tiêu đồng nào" chứ không phải "không đặt".
   *
   * Đọc bằng `parseMoneyInput` như ô số tiền: "2.000.000" hay "2tr" đều là hai
   * triệu, không phải 2.
   */
  monthlyBudget: z
    .string()
    .refine(
      (v) => v.trim() === '' || parseMoneyInput(v, DEFAULT_CURRENCY).ok,
      'expenseBudgetPositive',
    ),
})

export type ExpenseCategoryFormInput = z.infer<typeof expenseCategorySchema>

/** Về đúng kiểu của cột: `null` khi bỏ trống. */
export function parseBudget(value: string): number | null {
  if (value.trim() === '') return null
  const r = parseMoneyInput(value, DEFAULT_CURRENCY)
  return r.ok ? r.value : null
}
