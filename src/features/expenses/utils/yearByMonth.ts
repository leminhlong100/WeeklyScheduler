import type { Currency } from '@/lib/supabase/database.types'
import type { Expense } from '../api/expensesApi'
import { sumAmounts } from './money'

export interface MonthTotals {
  /** 0 = tháng 1. */
  monthIndex: number
  income: number
  expense: number
}

/**
 * Thu và chi đã thực trả của từng tháng trong năm, cho một đơn vị tiền. Luôn
 * trả đủ 12 phần tử (tháng trống là 0) để biểu đồ không bị co cột.
 *
 * Giống `summarizeByCurrency`, chỉ dòng `status = 'paid'` được cộng: kỳ định kỳ
 * chưa tới không phải là tiền đã tiêu của tháng đó.
 */
export function totalsByMonth(expenses: Expense[], currency: Currency): MonthTotals[] {
  const income: number[][] = Array.from({ length: 12 }, () => [])
  const expense: number[][] = Array.from({ length: 12 }, () => [])

  for (const e of expenses) {
    if (e.currency !== currency || e.status !== 'paid') continue
    const monthIndex = Number(e.spent_at.slice(5, 7)) - 1
    if (monthIndex < 0 || monthIndex > 11) continue
    ;(e.kind === 'income' ? income : expense)[monthIndex].push(e.amount)
  }

  return income.map((_, monthIndex) => ({
    monthIndex,
    income: sumAmounts(income[monthIndex]),
    expense: sumAmounts(expense[monthIndex]),
  }))
}
