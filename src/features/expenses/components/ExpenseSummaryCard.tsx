import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatMoney } from '@/lib/utils/formatMoney'
import type { CurrencySummary } from '../utils/totals'

const INCOME_COLOR = '#2fc39a'
const NEGATIVE_COLOR = '#d93a3a'

function Line({
  label,
  value,
  color,
  strong = false,
}: {
  label: string
  value: string
  color: string
  strong?: boolean
}) {
  const { theme } = useTheme()
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={strong ? 'text-[12px] font-extrabold' : 'text-[11.5px] font-bold'}
        style={{ color: strong ? theme.text : theme.muted }}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${strong ? 'font-heading text-[17px] font-extrabold' : 'text-[13px] font-bold'}`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Thu — Chi — Số dư của tháng đang xem, mỗi đơn vị tiền một khối, không quy đổi.
 *
 * Số dư là dòng to nhất vì đó là câu hỏi thật ("còn lại bao nhiêu"); tổng chi
 * một mình không trả lời được nó. Kỳ định kỳ chưa tới nằm ở dòng mờ phía dưới và
 * KHÔNG được trừ vào số dư — chưa trả thì tiền vẫn còn đó.
 */
export function ExpenseSummaryCard({ summaries }: { summaries: CurrencySummary[] }) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()

  if (summaries.length === 0) return null
  const showCurrencyLabel = summaries.length > 1

  return (
    <div className="flex flex-col gap-2">
      {summaries.map((s) => {
        const planned = s.plannedExpense > 0 || s.plannedIncome > 0
        return (
          <div
            key={s.currency}
            className="flex flex-col gap-1.5 rounded-2xl border-[1.5px] px-3.5 py-3"
            style={{ borderColor: theme.border, background: theme.chip }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="text-[11px] font-extrabold uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                {t.expenseMonthTotal}
              </span>
              {showCurrencyLabel && (
                <span className="text-[11px] font-extrabold" style={{ color: theme.muted }}>
                  {s.currency}
                </span>
              )}
            </div>

            <Line
              label={t.expenseIncomeTotal}
              value={`+${formatMoney(s.income, s.currency, locale)}`}
              color={INCOME_COLOR}
            />
            <Line
              label={t.expenseExpenseTotal}
              value={`−${formatMoney(s.expense, s.currency, locale)}`}
              color={theme.text}
            />
            <div className="mt-0.5 border-t pt-1.5" style={{ borderColor: theme.border }}>
              <Line
                label={t.expenseBalance}
                value={formatMoney(s.balance, s.currency, locale)}
                // Âm là tín hiệu cần thấy ngay: tháng này tiêu quá thu.
                color={s.balance < 0 ? NEGATIVE_COLOR : INCOME_COLOR}
                strong
              />
            </div>

            {planned && (
              <div
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-0.5 text-[11px] font-semibold"
                style={{ color: theme.muted }}
              >
                <span>{t.expensePlannedNotCounted}</span>
                {s.plannedExpense > 0 && (
                  <span className="tabular-nums">
                    −{formatMoney(s.plannedExpense, s.currency, locale)}
                  </span>
                )}
                {s.plannedIncome > 0 && (
                  <span className="tabular-nums">
                    +{formatMoney(s.plannedIncome, s.currency, locale)}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
