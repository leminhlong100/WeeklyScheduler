import type { Currency } from '@/lib/supabase/database.types'
import type { Expense } from '../api/expensesApi'

/**
 * Khoá cho nhóm "chưa phân loại". Dùng chuỗi riêng thay vì `null` để cả bảng
 * tổng hợp nằm gọn trong một `Map<string, number>`.
 */
export const UNCATEGORIZED = '__uncategorized__'

export interface CategoryBreakdown {
  /** id danh mục, hoặc `UNCATEGORIZED`. */
  categoryId: string
  total: number
  /** Tỉ lệ trên tổng CÙNG đơn vị tiền, 0..1. */
  share: number
}

export interface CurrencyReport {
  currency: Currency
  total: number
  previousTotal: number
  /**
   * Mức thay đổi so với tháng trước dạng tỉ lệ (0.25 = tăng 25%).
   * `null` khi tháng trước bằng 0: chia cho 0 ra `Infinity`, mà "tăng vô hạn
   * phần trăm" thì không nói lên điều gì — chỗ hiển thị sẽ ghi "tháng trước
   * chưa có khoản chi" thay vì một con số.
   */
  change: number | null
  /** Danh mục có chi trong tháng, nhiều nhất lên đầu. */
  categories: CategoryBreakdown[]
}

function sumPerCurrency(expenses: Expense[]): Map<Currency, number> {
  const totals = new Map<Currency, number>()
  for (const e of expenses) totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amount)
  return totals
}

/**
 * Gộp một tháng chi tiêu thành báo cáo, **tách hẳn theo đơn vị tiền**: mỗi
 * currency là một báo cáo độc lập với tổng, tỉ lệ danh mục và mức so sánh
 * riêng. Không có chỗ nào quy đổi VND sang JPY — tỉ giá không có trong dữ liệu
 * và đoán tỉ giá thì con số ra sai một cách khó phát hiện.
 *
 * Tính ở client trên dữ liệu TanStack Query đã fetch sẵn: một tháng chi tiêu cá
 * nhân chỉ vài trăm dòng, chưa đáng để thêm view/RPC phía Postgres.
 */
export function buildMonthlyReport(
  expenses: Expense[],
  previousExpenses: Expense[],
): CurrencyReport[] {
  const previousTotals = sumPerCurrency(previousExpenses)

  const byCurrency = new Map<Currency, Expense[]>()
  for (const e of expenses) {
    const bucket = byCurrency.get(e.currency)
    if (bucket) bucket.push(e)
    else byCurrency.set(e.currency, [e])
  }

  // Lấy cả currency chỉ xuất hiện ở tháng trước: tháng này ngưng tiêu JPY là
  // một thông tin đáng thấy (giảm 100%), bỏ đi thì báo cáo im lặng.
  const currencies = new Set<Currency>([...byCurrency.keys(), ...previousTotals.keys()])

  return [...currencies]
    .map((currency) => {
      const rows = byCurrency.get(currency) ?? []
      const total = rows.reduce((sum, e) => sum + e.amount, 0)
      const previousTotal = previousTotals.get(currency) ?? 0

      const perCategory = new Map<string, number>()
      for (const e of rows) {
        const key = e.category_id ?? UNCATEGORIZED
        perCategory.set(key, (perCategory.get(key) ?? 0) + e.amount)
      }

      return {
        currency,
        total,
        previousTotal,
        change: previousTotal > 0 ? (total - previousTotal) / previousTotal : null,
        categories: [...perCategory]
          .map(([categoryId, categoryTotal]) => ({
            categoryId,
            total: categoryTotal,
            share: total > 0 ? categoryTotal / total : 0,
          }))
          .sort((a, b) => b.total - a.total),
      }
    })
    .sort((a, b) => b.total - a.total)
}
