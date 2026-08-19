import { z } from 'zod'

export const expenseCategorySchema = z.object({
  name: z.string().min(1, 'fieldRequired').max(40),
  emoji: z.string().min(1, 'fieldRequired'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'fieldRequired'),
  /**
   * Chuỗi rỗng = không đặt hạn mức, khớp với `NULL` phía DB. Số 0 không được
   * nhận: cột có check `monthly_budget is null or monthly_budget > 0`, và "0"
   * nghĩa là "không được tiêu đồng nào" chứ không phải "không đặt".
   */
  monthlyBudget: z
    .string()
    .refine(
      (v) => v.trim() === '' || (Number.isFinite(Number(v)) && Number(v) > 0),
      'expenseBudgetPositive',
    ),
})

export type ExpenseCategoryFormInput = z.infer<typeof expenseCategorySchema>

/** Về đúng kiểu của cột: `null` khi bỏ trống, làm tròn 2 số lẻ cho `numeric(14,2)`. */
export function parseBudget(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  return Math.round(Number(trimmed) * 100) / 100
}
