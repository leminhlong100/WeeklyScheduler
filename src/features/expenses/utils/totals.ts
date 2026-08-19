import type { Currency } from '@/lib/supabase/database.types'
import type { Expense } from '../api/expensesApi'

export interface CurrencyTotal {
  currency: Currency
  total: number
}

/**
 * Tổng tách theo từng đơn vị tiền, KHÔNG quy đổi. Cộng 40.000 ₫ với 500 ¥ thành
 * một con số là số vô nghĩa; hiện hai dòng thì người đọc tự hiểu.
 * Thứ tự trả về theo lần xuất hiện đầu tiên, để danh sách không nhảy lung tung.
 */
export function sumByCurrency(expenses: Expense[]): CurrencyTotal[] {
  const totals = new Map<Currency, number>()
  for (const e of expenses) {
    totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amount)
  }
  return [...totals].map(([currency, total]) => ({ currency, total }))
}
