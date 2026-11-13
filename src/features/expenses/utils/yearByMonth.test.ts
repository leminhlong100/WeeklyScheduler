import { describe, expect, it } from 'vitest'
import type { Expense } from '../api/expensesApi'
import { totalsByMonth } from './yearByMonth'

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

describe('totalsByMonth', () => {
  it('always returns 12 months, empty ones as 0', () => {
    const r = totalsByMonth([], 'VND')
    expect(r).toHaveLength(12)
    expect(r.every((m) => m.income === 0 && m.expense === 0)).toBe(true)
  })

  it('puts paid income and expense into their month', () => {
    const r = totalsByMonth(
      [
        e({ amount: 30000, spent_at: '2026-01-05' }),
        e({ amount: 20000, spent_at: '2026-01-31' }),
        e({ amount: 1000000, kind: 'income', spent_at: '2026-12-01' }),
      ],
      'VND',
    )
    expect(r[0]).toEqual({ monthIndex: 0, income: 0, expense: 50000 })
    expect(r[11]).toEqual({ monthIndex: 11, income: 1000000, expense: 0 })
  })

  it('skips planned rows and other currencies', () => {
    const r = totalsByMonth(
      [
        e({ amount: 5000, status: 'planned', spent_at: '2026-03-01' }),
        e({ amount: 500, currency: 'JPY', spent_at: '2026-03-01' }),
      ],
      'VND',
    )
    expect(r[2].expense).toBe(0)
  })

  it('adds decimals without float drift', () => {
    const r = totalsByMonth(
      [
        e({ amount: 0.1, currency: 'USD', spent_at: '2026-02-01' }),
        e({ amount: 0.2, currency: 'USD', spent_at: '2026-02-02' }),
      ],
      'USD',
    )
    expect(r[1].expense).toBe(0.3)
  })
})
