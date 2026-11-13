import { describe, expect, it } from 'vitest'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { buildBudgetProgress, computeSpendable, isOverdue, upcomingPlanned } from './overview'

let n = 0
const e = (p: Partial<Expense>): Expense =>
  ({
    id: `e${++n}`,
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
    spent_at: '2026-11-10',
    created_at: '',
    updated_at: '',
    ...p,
  }) as Expense
const c = (p: Partial<ExpenseCategory>): ExpenseCategory =>
  ({
    id: `c${++n}`,
    user_id: 'u',
    name: 'x',
    emoji: '🍜',
    color: '#ff0000',
    kind: 'expense',
    monthly_budget: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    ...p,
  }) as ExpenseCategory

const food = c({ id: 'food', monthly_budget: 3_000_000 })
const move = c({ id: 'move', monthly_budget: 1_000_000 })
const fun = c({ id: 'fun' })
const salary = c({ id: 'salary', kind: 'income', monthly_budget: null })

describe('computeSpendable', () => {
  it('chưa có hạn mức → mode balance', () => {
    expect(computeSpendable([], [fun, salary], '2026-11', '2026-11-13').mode).toBe('balance')
  })

  it('còn được tiêu = Σ hạn mức − đã trả trong các danh mục đó (VND)', () => {
    const data = [
      e({ category_id: 'food', amount: 1_000_000 }),
      e({ category_id: 'move', amount: 200_000 }),
      e({ category_id: 'fun', amount: 999_000 }), // không có hạn mức → không trừ
      e({ category_id: 'food', amount: 500, currency: 'JPY' }), // khác tiền tệ → bỏ
      e({ category_id: 'food', amount: 300_000, status: 'planned', spent_at: '2026-11-20' }),
      e({ category_id: 'salary', kind: 'income', amount: 15_000_000 }),
    ]
    const s = computeSpendable(data, [food, move, fun, salary], '2026-11', '2026-11-13')
    expect(s).toMatchObject({
      mode: 'budget',
      budgetTotal: 4_000_000,
      spent: 1_200_000,
      remaining: 2_800_000,
      planned: 300_000,
      daysLeft: 18, // 13 → 30, tính cả hôm nay
    })
    if (s.mode === 'budget') expect(s.perDay).toBe(Math.floor(2_800_000 / 18))
  })

  it('tháng khác tháng hiện tại → không có tiền/ngày', () => {
    const s = computeSpendable([], [food], '2026-10', '2026-11-13')
    expect(s.mode === 'budget' && s.perDay).toBeNull()
  })

  it('vượt hạn mức → remaining âm, perDay 0', () => {
    const s = computeSpendable(
      [e({ category_id: 'move', amount: 1_500_000 })],
      [move],
      '2026-11',
      '2026-11-30',
    )
    expect(s).toMatchObject({ remaining: -500_000, perDay: 0, daysLeft: 1 })
  })
})

describe('buildBudgetProgress', () => {
  it('giữ cả danh mục chưa tiêu, sắp theo % giảm dần, đánh dấu 80% và vượt', () => {
    const rows = buildBudgetProgress(
      [
        e({ category_id: 'food', amount: 2_500_000 }),
        e({ category_id: 'move', amount: 1_200_000 }),
      ],
      [food, move, c({ id: 'gift', monthly_budget: 500_000 })],
    )
    expect(rows.map((r) => [r.category.id, r.spent, r.warning, r.over])).toEqual([
      ['move', 1_200_000, true, true],
      ['food', 2_500_000, true, false],
      ['gift', 0, false, false],
    ])
  })
})

describe('upcomingPlanned', () => {
  it('quá hạn + 7 ngày tới, gần nhất trước', () => {
    const list = upcomingPlanned(
      [
        e({ status: 'planned', spent_at: '2026-11-25' }),
        e({ status: 'planned', spent_at: '2026-11-15', note: 'b' }),
        e({ status: 'planned', spent_at: '2026-11-01', note: 'a' }),
        e({ status: 'paid', spent_at: '2026-11-14' }),
      ],
      '2026-11-13',
    )
    expect(list.map((x) => x.note)).toEqual(['a', 'b'])
    expect(isOverdue(list[0], '2026-11-13')).toBe(true)
  })
})
