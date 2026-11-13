import { describe, expect, it } from 'vitest'
import type { Expense } from '../api/expensesApi'
import { subtractAmounts, sumAmounts } from './money'
import { summarizeByCurrency } from './totals'
import { buildMonthlyReport, UNCATEGORIZED } from './report'
import { EMPTY_EXPENSE_FILTER, filterExpenses, groupByDay, isFilterActive } from './filter'

let seq = 0
function row(p: Partial<Expense>): Expense {
  seq += 1
  return {
    id: `id-${seq}`,
    user_id: 'u',
    ledger_id: null,
    category_id: null,
    amount: 0,
    currency: 'VND',
    kind: 'expense',
    status: 'paid',
    note: '',
    raw_text: null,
    source: 'manual',
    series_id: null,
    spent_at: '2026-08-10',
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
    ...p,
  } as Expense
}

describe('money', () => {
  it('cộng không lệch float', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3)
    expect(subtractAmounts(0.3, 0.1)).toBe(0.2)
    expect(sumAmounts([])).toBe(0)
  })
})

describe('summarizeByCurrency', () => {
  const data = [
    row({ amount: 500000, kind: 'expense' }),
    row({ amount: 15000000, kind: 'income' }),
    row({ amount: 4000000, kind: 'expense', status: 'planned' }),
    row({ amount: 1200, currency: 'JPY' }),
  ]
  const [vnd, jpy] = summarizeByCurrency(data)

  it('tách theo currency, giữ thứ tự xuất hiện', () => {
    expect(vnd.currency).toBe('VND')
    expect(jpy.currency).toBe('JPY')
    expect(jpy.expense).toBe(1200)
  })
  it('planned không vào số dư', () => {
    expect(vnd.expense).toBe(500000)
    expect(vnd.income).toBe(15000000)
    expect(vnd.balance).toBe(14500000)
    expect(vnd.plannedExpense).toBe(4000000)
  })
  it('rỗng → mảng rỗng', () => {
    expect(summarizeByCurrency([])).toEqual([])
  })
})

describe('buildMonthlyReport', () => {
  const food = 'cat-food'
  const move = 'cat-move'
  const aug = [
    row({ amount: 500000, category_id: food }),
    row({ amount: 250000, category_id: move }),
    row({ amount: 50000 }),
    row({ amount: 1200, currency: 'JPY' }),
  ]
  const jul = [
    row({ amount: 350000, spent_at: '2026-07-05' }),
    row({ amount: 150000, spent_at: '2026-07-25' }),
  ]

  it('tổng và tỉ lệ khớp tính tay', () => {
    const [vnd] = buildMonthlyReport(aug, jul)
    expect(vnd.expenseTotal).toBe(800000)
    const shares = vnd.expenseCategories.map((c) => Math.round(c.share * 100))
    expect(shares).toEqual([63, 31, 6])
    expect(vnd.expenseCategories[2].categoryId).toBe(UNCATEGORIZED)
  })
  it('so với tháng trước cả tháng', () => {
    const [vnd] = buildMonthlyReport(aug, jul)
    expect(vnd.change).toBeCloseTo(0.6)
  })
  it('so cùng kỳ khi có cutoff', () => {
    const [vnd] = buildMonthlyReport(aug, jul, { previousCutoffDay: 20 })
    expect(vnd.previousExpenseTotal).toBe(350000)
  })
  it('tháng trước = 0 → change null', () => {
    const [vnd] = buildMonthlyReport(aug, [])
    expect(vnd.change).toBeNull()
  })
  it('currency chỉ có ở tháng trước vẫn được giữ', () => {
    const r = buildMonthlyReport([row({ amount: 1 })], [row({ amount: 1200, currency: 'JPY' })])
    const jpy = r.find((x) => x.currency === 'JPY')
    expect(jpy?.expenseTotal).toBe(0)
    expect(jpy?.change).toBe(-1)
  })
  it('planned không vào tổng', () => {
    const [vnd] = buildMonthlyReport(
      [row({ amount: 100, status: 'planned' }), row({ amount: 50 })],
      [],
    )
    expect(vnd.expenseTotal).toBe(50)
    expect(vnd.plannedExpense).toBe(100)
  })
})

describe('filterExpenses', () => {
  const data = [
    row({ note: 'Cà phê sáng', amount: 35000 }),
    row({ note: 'Bún bò', amount: 40000, category_id: 'food' }),
    row({ note: 'Lương', amount: 15000000, kind: 'income' }),
  ]
  it('không lọc → giữ nguyên', () => {
    expect(isFilterActive(EMPTY_EXPENSE_FILTER)).toBe(false)
    expect(filterExpenses(data, EMPTY_EXPENSE_FILTER)).toHaveLength(3)
  })
  it('tìm không dấu', () => {
    const r = filterExpenses(data, { ...EMPTY_EXPENSE_FILTER, query: 'ca phe' })
    expect(r.map((e) => e.note)).toEqual(['Cà phê sáng'])
  })
  it('lọc theo kind và chưa phân loại', () => {
    expect(filterExpenses(data, { ...EMPTY_EXPENSE_FILTER, kind: 'income' })).toHaveLength(1)
    expect(
      filterExpenses(data, { ...EMPTY_EXPENSE_FILTER, categoryId: UNCATEGORIZED }),
    ).toHaveLength(2)
  })
  it('gom theo ngày giữ thứ tự', () => {
    const g = groupByDay([
      row({ spent_at: '2026-08-11' }),
      row({ spent_at: '2026-08-11' }),
      row({ spent_at: '2026-08-10' }),
    ])
    expect(g.map((x) => [x.date, x.expenses.length])).toEqual([
      ['2026-08-11', 2],
      ['2026-08-10', 1],
    ])
  })
})

describe('filterExpenses — tìm số tiền và danh mục', () => {
  const data = [
    row({ note: 'Bún bò', amount: 40000, category_id: 'food' }),
    row({ note: 'Grab', amount: 35000, category_id: 'move' }),
  ]
  const names = new Map([
    ['food', 'Ăn uống'],
    ['move', 'Di chuyển'],
  ])
  it.each(['40.000', '40k', '40000'])('"%s" ra khoản 40.000', (query) => {
    const r = filterExpenses(data, { ...EMPTY_EXPENSE_FILTER, query }, { categoryNames: names })
    expect(r.map((e) => e.note)).toEqual(['Bún bò'])
  })
  it('tìm theo tên danh mục, không dấu', () => {
    const r = filterExpenses(
      data,
      { ...EMPTY_EXPENSE_FILTER, query: 'an uong' },
      { categoryNames: names },
    )
    expect(r.map((e) => e.note)).toEqual(['Bún bò'])
  })
  it('đang che số tiền thì không khớp theo số', () => {
    const r = filterExpenses(
      data,
      { ...EMPTY_EXPENSE_FILTER, query: '40k' },
      { matchAmount: false },
    )
    expect(r).toHaveLength(0)
  })
})
