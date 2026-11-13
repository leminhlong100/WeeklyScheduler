import { useMemo, useState } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { formatSignedMoney } from '@/lib/utils/formatMoney'
import type { Currency } from '@/lib/supabase/database.types'
import { useAmountVisibility } from '../AmountVisibilityContext'
import { useExpensesForYear } from '../hooks/useExpenses'
import { summarizeByCurrency } from '../utils/totals'
import { totalsByMonth } from '../utils/yearByMonth'
import { currentMonthKey, type MonthKey } from '../utils/month'
import { MaskedAmount } from './MaskedAmount'

/**
 * Thẻ "Năm …" ở sidebar trang chi tiêu: thu, chi, số dư cả năm của sổ đang mở,
 * và 12 cột chi theo tháng. Bấm một cột là nhảy tới tháng đó.
 *
 * Năm đi theo tháng đang xem, nên dùng chung query với thẻ năm ở tab Báo cáo.
 * Nhiều đơn vị tiền thì không cộng gộp — có chip để chọn đơn vị đang xem.
 */
export function SidebarYearCard({
  month,
  onPickMonth,
}: {
  month: MonthKey
  onPickMonth: (month: MonthKey) => void
}) {
  const { t, locale } = useTranslation()
  const { isMasked } = useAmountVisibility()
  const year = Number(month.slice(0, 4))
  const { data, isLoading } = useExpensesForYear(year)
  const expenses = useMemo(() => data ?? [], [data])
  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])

  const [pickedCurrency, setPickedCurrency] = useState<Currency | null>(null)
  const summary = summaries.find((s) => s.currency === pickedCurrency) ?? summaries[0]
  const months = useMemo(
    () => (summary ? totalsByMonth(expenses, summary.currency) : []),
    [expenses, summary],
  )
  const maxExpense = Math.max(0, ...months.map((m) => m.expense))

  const viewedMonthIndex = Number(month.slice(5, 7)) - 1
  const today = currentMonthKey()
  const masked = isMasked('year')

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/78">
          {t.yearSection.replace('{year}', String(year))}
        </span>
        {summaries.length > 1 && (
          <div className="flex gap-1">
            {summaries.map((s) => (
              <button
                key={s.currency}
                type="button"
                onClick={() => setPickedCurrency(s.currency)}
                aria-pressed={s.currency === summary?.currency}
                className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold transition-colors"
                style={{
                  background:
                    s.currency === summary?.currency
                      ? 'rgba(255,255,255,.9)'
                      : 'rgba(255,255,255,.16)',
                  color: s.currency === summary?.currency ? '#1f2937' : '#fff',
                }}
              >
                {s.currency}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/13 px-3.5 py-3">
        {!summary ? (
          <p className="text-xs font-semibold text-white/78">
            {isLoading ? '…' : t.sidebarYearEmpty}
          </p>
        ) : (
          <>
            <div className="text-[11px] font-bold text-white/78">{t.expenseBalance}</div>
            <div className="font-heading text-[22px] font-extrabold leading-tight tabular-nums">
              <MaskedAmount scope="year">
                {formatSignedMoney(summary.balance, summary.currency, locale, 'auto')}
              </MaskedAmount>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[12px] font-bold tabular-nums">
              <div className="min-w-0">
                <div className="text-[10.5px] text-white/70">{t.expenseIncomeTotal}</div>
                <div className="truncate">
                  <MaskedAmount scope="year">
                    {formatSignedMoney(summary.income, summary.currency, locale, 'income')}
                  </MaskedAmount>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10.5px] text-white/70">{t.expenseExpenseTotal}</div>
                <div className="truncate">
                  <MaskedAmount scope="year">
                    {formatSignedMoney(summary.expense, summary.currency, locale, 'expense')}
                  </MaskedAmount>
                </div>
              </div>
            </div>

            <div
              className="mt-3 flex h-[64px] items-end gap-[3px]"
              role="group"
              aria-label={t.sidebarYearChart}
            >
              {months.map((m) => {
                const key = `${year}-${String(m.monthIndex + 1).padStart(2, '0')}`
                const viewed = m.monthIndex === viewedMonthIndex
                const future = key > today
                const pct = maxExpense > 0 ? (m.expense / maxExpense) * 100 : 0
                const label = `${t.mon[m.monthIndex]} ${year}`
                const amount = formatSignedMoney(m.expense, summary.currency, locale, 'expense')
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPickMonth(key)}
                    aria-current={viewed ? 'date' : undefined}
                    aria-label={masked ? label : `${label}: ${amount}`}
                    title={masked ? label : `${label}: ${amount}`}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="flex min-h-0 w-full flex-1 items-end">
                      <span
                        className="w-full rounded-t-[4px] transition-[height] duration-200 group-hover:opacity-80"
                        style={{
                          // Tháng có chi nhưng rất ít vẫn phải thấy được một vạch.
                          height: m.expense > 0 ? `max(${pct}%, 3px)` : '2px',
                          background: viewed
                            ? '#fff'
                            : future
                              ? 'rgba(255,255,255,.18)'
                              : 'rgba(255,255,255,.42)',
                        }}
                      />
                    </span>
                    <span
                      className="text-[9.5px] leading-none font-extrabold tabular-nums"
                      style={{ color: viewed ? '#fff' : 'rgba(255,255,255,.62)' }}
                    >
                      {m.monthIndex + 1}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
