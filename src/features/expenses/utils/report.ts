import type { Currency } from '@/lib/supabase/database.types'
import type { Expense } from '../api/expensesApi'
import { subtractAmounts, sumAmounts } from './money'

/**
 * Khoá cho nhóm "chưa phân loại". Dùng chuỗi riêng thay vì `null` để cả bảng
 * tổng hợp nằm gọn trong một `Map<string, number>`.
 */
export const UNCATEGORIZED = '__uncategorized__'

export interface CategoryBreakdown {
  /** id danh mục, hoặc `UNCATEGORIZED`. */
  categoryId: string
  total: number
  /** Tỉ lệ trên tổng CÙNG đơn vị tiền, cùng kind, 0..1. */
  share: number
}

export interface CurrencyReport {
  currency: Currency
  /** Đã thực trả trong tháng (`status = 'paid'`). */
  expenseTotal: number
  /** Đã thực nhận trong tháng. */
  incomeTotal: number
  /** `incomeTotal - expenseTotal`. Âm = tiêu quá thu. */
  balance: number
  /** Kỳ định kỳ chưa tới — hiện riêng, không nằm trong tổng hay số dư. */
  plannedExpense: number
  plannedIncome: number
  /** Tổng chi tháng trước trong CÙNG cửa sổ so sánh (xem `previousCutoffDay`). */
  previousExpenseTotal: number
  /**
   * Mức thay đổi của tiền CHI so với tháng trước dạng tỉ lệ (0.25 = tăng 25%).
   * `null` khi cửa sổ tháng trước bằng 0: chia cho 0 ra `Infinity`, mà "tăng vô
   * hạn phần trăm" thì không nói lên điều gì — chỗ hiển thị sẽ ghi "tháng trước
   * chưa có khoản chi" thay vì một con số.
   */
  change: number | null
  /** Danh mục CHI có phát sinh trong tháng, nhiều nhất lên đầu. */
  expenseCategories: CategoryBreakdown[]
  /** Danh mục THU có phát sinh trong tháng, nhiều nhất lên đầu. */
  incomeCategories: CategoryBreakdown[]
}

interface BuildReportOptions {
  /**
   * Chỉ tính các khoản của tháng trước có ngày <= ngày này khi so sánh.
   *
   * Xem tháng đang diễn ra thì cửa sổ hai bên phải bằng nhau: hôm nay mùng 20,
   * so 20 ngày của tháng này với TRỌN tháng trước sẽ luôn ra "giảm mạnh" và đọc
   * như một tin vui bịa ra. `null` = tháng đã kết thúc, so cả tháng.
   */
  previousCutoffDay?: number | null
}

/** Ngày trong tháng lấy thẳng từ chuỗi 'YYYY-MM-DD' — khỏi dựng Date và khỏi lệch múi giờ. */
function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10))
}

const isPaid = (e: Expense) => e.status === 'paid'

function sumOf(rows: Expense[]): number {
  return sumAmounts(rows.map((e) => e.amount))
}

function breakdown(rows: Expense[], total: number): CategoryBreakdown[] {
  const perCategory = new Map<string, number[]>()
  for (const e of rows) {
    const key = e.category_id ?? UNCATEGORIZED
    const bucket = perCategory.get(key)
    if (bucket) bucket.push(e.amount)
    else perCategory.set(key, [e.amount])
  }

  return [...perCategory]
    .map(([categoryId, amounts]) => {
      const categoryTotal = sumAmounts(amounts)
      return {
        categoryId,
        total: categoryTotal,
        share: total > 0 ? categoryTotal / total : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/**
 * Gộp một tháng thành báo cáo, **tách hẳn theo đơn vị tiền**: mỗi currency là
 * một báo cáo độc lập với tổng thu, tổng chi, số dư, tỉ lệ danh mục và mức so
 * sánh riêng. Không có chỗ nào quy đổi VND sang JPY — tỉ giá không có trong dữ
 * liệu và đoán tỉ giá thì con số ra sai một cách khó phát hiện.
 *
 * Chỉ `status = 'paid'` vào tổng và số dư; 'planned' trả về ở hai ô riêng.
 *
 * Tính ở client trên dữ liệu TanStack Query đã fetch sẵn: một tháng chi tiêu cá
 * nhân chỉ vài trăm dòng, chưa đáng để thêm view/RPC phía Postgres.
 */
export function buildMonthlyReport(
  expenses: Expense[],
  previousExpenses: Expense[],
  { previousCutoffDay = null }: BuildReportOptions = {},
): CurrencyReport[] {
  const inCompareWindow = (e: Expense) =>
    previousCutoffDay === null || dayOfMonth(e.spent_at) <= previousCutoffDay

  const previousPaidExpenses = previousExpenses.filter(
    (e) => isPaid(e) && e.kind === 'expense' && inCompareWindow(e),
  )

  const byCurrency = new Map<Currency, Expense[]>()
  for (const e of expenses) {
    const bucket = byCurrency.get(e.currency)
    if (bucket) bucket.push(e)
    else byCurrency.set(e.currency, [e])
  }

  const previousByCurrency = new Map<Currency, number>()
  for (const e of previousPaidExpenses) {
    previousByCurrency.set(e.currency, (previousByCurrency.get(e.currency) ?? 0) + e.amount)
  }

  // Lấy cả currency chỉ xuất hiện ở tháng trước: tháng này ngưng tiêu JPY là một
  // thông tin đáng thấy (giảm 100%), bỏ đi thì báo cáo im lặng.
  const currencies = new Set<Currency>([...byCurrency.keys(), ...previousByCurrency.keys()])

  return [...currencies]
    .map((currency) => {
      const rows = byCurrency.get(currency) ?? []
      const paidExpenseRows = rows.filter((e) => isPaid(e) && e.kind === 'expense')
      const paidIncomeRows = rows.filter((e) => isPaid(e) && e.kind === 'income')

      const expenseTotal = sumOf(paidExpenseRows)
      const incomeTotal = sumOf(paidIncomeRows)
      const previousExpenseTotal = sumAmounts(
        previousPaidExpenses.filter((e) => e.currency === currency).map((e) => e.amount),
      )

      return {
        currency,
        expenseTotal,
        incomeTotal,
        balance: subtractAmounts(incomeTotal, expenseTotal),
        plannedExpense: sumOf(rows.filter((e) => e.status === 'planned' && e.kind === 'expense')),
        plannedIncome: sumOf(rows.filter((e) => e.status === 'planned' && e.kind === 'income')),
        previousExpenseTotal,
        change:
          previousExpenseTotal > 0
            ? (expenseTotal - previousExpenseTotal) / previousExpenseTotal
            : null,
        expenseCategories: breakdown(paidExpenseRows, expenseTotal),
        incomeCategories: breakdown(paidIncomeRows, incomeTotal),
      }
    })
    .sort((a, b) => b.expenseTotal + b.incomeTotal - (a.expenseTotal + a.incomeTotal))
}
