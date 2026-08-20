import type { Currency } from '@/lib/supabase/database.types'
import type { Expense } from '../api/expensesApi'
import { subtractAmounts, sumAmounts } from './money'

export interface CurrencySummary {
  currency: Currency
  /** Tiền vào đã thực nhận. */
  income: number
  /** Tiền ra đã thực trả. */
  expense: number
  /** `income - expense`. Âm = tháng này tiêu quá thu. */
  balance: number
  /** Kỳ định kỳ chưa tới, tách riêng — chưa xảy ra thì không được vào số dư. */
  plannedExpense: number
  plannedIncome: number
}

/**
 * Tổng một tháng, tách theo từng đơn vị tiền và KHÔNG quy đổi. Cộng 40.000 ₫ với
 * 500 ¥ thành một con số là số vô nghĩa; hiện hai khối thì người đọc tự hiểu.
 *
 * Chỉ `status = 'paid'` được cộng vào `income`/`expense`/`balance`. Các kỳ
 * 'planned' (tiền nhà tháng sau, đã có dòng trong DB từ lúc tạo chuỗi) nằm ở hai
 * ô riêng: cộng chúng vào số dư là báo một khoản chưa hề trả như đã trả.
 *
 * Thứ tự trả về theo lần xuất hiện đầu tiên, để danh sách không nhảy lung tung
 * khi thêm bớt một dòng.
 */
export function summarizeByCurrency(expenses: Expense[]): CurrencySummary[] {
  const order: Currency[] = []
  const buckets = new Map<Currency, Expense[]>()

  for (const e of expenses) {
    const bucket = buckets.get(e.currency)
    if (bucket) {
      bucket.push(e)
    } else {
      buckets.set(e.currency, [e])
      order.push(e.currency)
    }
  }

  return order.map((currency) => {
    const rows = buckets.get(currency) ?? []
    const pick = (kind: Expense['kind'], status: Expense['status']) =>
      sumAmounts(rows.filter((e) => e.kind === kind && e.status === status).map((e) => e.amount))

    const income = pick('income', 'paid')
    const expense = pick('expense', 'paid')

    return {
      currency,
      income,
      expense,
      balance: subtractAmounts(income, expense),
      plannedExpense: pick('expense', 'planned'),
      plannedIncome: pick('income', 'planned'),
    }
  })
}
