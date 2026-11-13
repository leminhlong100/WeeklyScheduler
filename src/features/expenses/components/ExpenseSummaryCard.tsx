import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatSignedMoney } from '@/lib/utils/formatMoney'
import { useAmountVisibility, type AmountScope } from '../AmountVisibilityContext'
import { MaskedAmount } from './MaskedAmount'
import type { CurrencySummary } from '../utils/totals'

function Line({
  label,
  value,
  color,
  strong = false,
  scope,
}: {
  label: string
  value: string
  color: string
  strong?: boolean
  scope: AmountScope
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
        <MaskedAmount scope={scope}>{value}</MaskedAmount>
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
export function ExpenseSummaryCard({
  summaries,
  title,
  collapsible = false,
  scope = 'month',
}: {
  summaries: CurrencySummary[]
  /** Khối này thuộc nhóm ẩn nào: tổng tháng hay tổng năm. */
  scope?: AmountScope
  /** Mặc định là "Tổng tháng"; thẻ cả năm truyền nhãn riêng. */
  title?: string
  /** Thu gọn thành một hàng (nhãn + số dư), bấm vào mới sổ ra đủ thu/chi/số dư. */
  collapsible?: boolean
}) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { hidden, toggleHidden } = useAmountVisibility()
  const [open, setOpen] = useState(false)

  if (summaries.length === 0) return null
  const showCurrencyLabel = summaries.length > 1

  if (collapsible && !open) {
    return (
      <div className="flex flex-col gap-1.5">
        {summaries.map((s) => (
          <button
            key={s.currency}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] px-3.5 py-2 text-left transition-transform duration-150 active:scale-[0.99]"
            style={{ borderColor: theme.border, background: theme.chip }}
          >
            <span
              className="text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: theme.mutedText }}
            >
              {title}
              {showCurrencyLabel && ` · ${s.currency}`}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="font-heading text-[14px] font-extrabold tabular-nums"
                style={{ color: s.balance < 0 ? theme.danger : theme.income }}
              >
                <MaskedAmount scope={scope}>
                  {formatSignedMoney(s.balance, s.currency, locale, 'auto')}
                </MaskedAmount>
              </span>
              <ChevronDownIcon className="size-4" style={{ color: theme.mutedText }} />
            </span>
          </button>
        ))}
      </div>
    )
  }

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
                style={{ color: theme.mutedText }}
              >
                {title ?? t.expenseMonthTotal}
              </span>
              <span className="flex items-center gap-2">
                {showCurrencyLabel && (
                  <span className="text-[11px] font-extrabold" style={{ color: theme.mutedText }}>
                    {s.currency}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleHidden}
                  aria-label={hidden ? t.showAmounts : t.hideAmounts}
                  title={hidden ? t.showAmounts : t.hideAmounts}
                  className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md transition-transform duration-150 active:scale-95"
                  style={{ color: theme.mutedText }}
                >
                  {hidden ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                </button>
                {collapsible && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-expanded
                    aria-label={title}
                    className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md transition-transform duration-150 active:scale-95"
                    style={{ color: theme.mutedText }}
                  >
                    <ChevronUpIcon className="size-4" />
                  </button>
                )}
              </span>
            </div>

            <Line
              scope={scope}
              label={t.expenseIncomeTotal}
              value={formatSignedMoney(s.income, s.currency, locale, 'income')}
              color={theme.income}
            />
            <Line
              scope={scope}
              label={t.expenseExpenseTotal}
              value={formatSignedMoney(s.expense, s.currency, locale, 'expense')}
              color={theme.text}
            />
            <div className="mt-0.5 border-t pt-1.5" style={{ borderColor: theme.border }}>
              <Line
                scope={scope}
                label={t.expenseBalance}
                value={formatSignedMoney(s.balance, s.currency, locale, 'auto')}
                // Âm là tín hiệu cần thấy ngay: tháng này tiêu quá thu.
                color={s.balance < 0 ? theme.danger : theme.income}
                strong
              />
            </div>

            {planned && (
              <div
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-0.5 text-[11px] font-semibold"
                style={{ color: theme.mutedText }}
              >
                <span>{t.expensePlannedNotCounted}</span>
                {s.plannedExpense > 0 && (
                  <span className="tabular-nums">
                    <MaskedAmount scope={scope}>
                      {formatSignedMoney(s.plannedExpense, s.currency, locale, 'expense')}
                    </MaskedAmount>
                  </span>
                )}
                {s.plannedIncome > 0 && (
                  <span className="tabular-nums">
                    <MaskedAmount scope={scope}>
                      {formatSignedMoney(s.plannedIncome, s.currency, locale, 'income')}
                    </MaskedAmount>
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
