import dayjs from 'dayjs'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'
import { subtractAmounts, sumAmounts } from './money'
import type { DateRange } from './month'

/**
 * Con số chính của trang Tổng quan.
 *
 * Hạn mức chỉ có nghĩa trong `DEFAULT_CURRENCY` (cột `monthly_budget` không mang
 * đơn vị — xem chú thích ở `expenseSchema.ts`), nên mọi phép tính ở đây chỉ lấy
 * khoản chi VND.
 */
export type Spendable =
  | {
      mode: 'budget'
      /** Σ hạn mức của các danh mục chi có đặt hạn mức. */
      budgetTotal: number
      /** Đã trả trong các danh mục đó. */
      spent: number
      /** `budgetTotal − spent`. Âm = đã vượt. */
      remaining: number
      /** Khoản dự kiến (chưa trả) trong các danh mục đó. */
      planned: number
      /** 0..∞, `spent / budgetTotal`. */
      usedRatio: number
      /** Số ngày còn lại của kỳ, tính cả hôm nay; `null` khi kỳ đang xem không chứa hôm nay. */
      daysLeft: number | null
      /** `max(remaining, 0) / daysLeft`; `null` khi `daysLeft` null. */
      perDay: number | null
    }
  | { mode: 'balance' }

const isBudgeted = (c: ExpenseCategory) => c.kind === 'expense' && c.monthly_budget != null

const inDefaultCurrency = (e: Expense) => e.currency === DEFAULT_CURRENCY && e.kind === 'expense'

const inRange = (e: Expense, range: DateRange) =>
  e.spent_at >= range.startISO && e.spent_at < range.endExclusiveISO

/**
 * `cycle` là kỳ hạn mức (xem `budgetCycleRange`) — trùng tháng dương lịch khi
 * kỳ bắt đầu ngày 1. `expenses` phải phủ hết kỳ; dòng ngoài kỳ bị bỏ qua.
 */
export function computeSpendable(
  expenses: Expense[],
  categories: ExpenseCategory[],
  cycle: DateRange,
  todayISO: string,
): Spendable {
  const budgeted = categories.filter(isBudgeted)
  if (budgeted.length === 0) return { mode: 'balance' }

  const ids = new Set(budgeted.map((c) => c.id))
  const rows = expenses.filter(
    (e) =>
      inDefaultCurrency(e) && inRange(e, cycle) && e.category_id !== null && ids.has(e.category_id),
  )
  const budgetTotal = sumAmounts(budgeted.map((c) => c.monthly_budget ?? 0))
  const spent = sumAmounts(rows.filter((e) => e.status === 'paid').map((e) => e.amount))
  const planned = sumAmounts(rows.filter((e) => e.status === 'planned').map((e) => e.amount))
  const remaining = subtractAmounts(budgetTotal, spent)

  // Tính cả hôm nay: còn bao nhiêu ngày (kể cả hôm nay) trước khi kỳ mới bắt đầu.
  const isCurrent = todayISO >= cycle.startISO && todayISO < cycle.endExclusiveISO
  const daysLeft = isCurrent ? dayjs(cycle.endExclusiveISO).diff(dayjs(todayISO), 'day') : null
  const perDay = daysLeft ? Math.floor(Math.max(remaining, 0) / daysLeft) : null

  return {
    mode: 'budget',
    budgetTotal,
    spent,
    remaining,
    planned,
    usedRatio: budgetTotal > 0 ? spent / budgetTotal : 0,
    daysLeft,
    perDay,
  }
}

export interface BudgetProgressRow {
  category: ExpenseCategory
  spent: number
  budget: number
  ratio: number
  /** ≥ 80% hạn mức. */
  warning: boolean
  over: boolean
}

/**
 * Mọi danh mục chi CÓ hạn mức, kể cả chưa tiêu đồng nào (hiện `0 / 2.000.000`
 * — trước đây danh mục chưa phát sinh thì biến mất khỏi báo cáo). Sắp theo %
 * đã dùng giảm dần: danh mục sắp cạn nằm trên cùng.
 */
export function buildBudgetProgress(
  expenses: Expense[],
  categories: ExpenseCategory[],
  /** Kỳ hạn mức; bỏ trống thì tính mọi dòng được đưa vào. */
  cycle?: DateRange,
): BudgetProgressRow[] {
  return categories
    .filter(isBudgeted)
    .map((category) => {
      const budget = category.monthly_budget ?? 0
      const spent = sumAmounts(
        expenses
          .filter(
            (e) =>
              inDefaultCurrency(e) &&
              e.status === 'paid' &&
              e.category_id === category.id &&
              (!cycle || inRange(e, cycle)),
          )
          .map((e) => e.amount),
      )
      const ratio = budget > 0 ? spent / budget : 0
      return { category, spent, budget, ratio, warning: ratio >= 0.8, over: spent > budget }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

/**
 * Khoản dự kiến cần để ý: đã quá hạn, hoặc tới hạn trong `withinDays` ngày tới.
 * Ngày gần nhất lên đầu.
 */
export function upcomingPlanned(expenses: Expense[], todayISO: string, withinDays = 7): Expense[] {
  const limit = dayjs(todayISO).add(withinDays, 'day').format('YYYY-MM-DD')
  return expenses
    .filter((e) => e.status === 'planned' && e.spent_at <= limit)
    .sort((a, b) => (a.spent_at < b.spent_at ? -1 : a.spent_at > b.spent_at ? 1 : 0))
}

export const isOverdue = (e: Expense, todayISO: string) =>
  e.status === 'planned' && e.spent_at < todayISO
