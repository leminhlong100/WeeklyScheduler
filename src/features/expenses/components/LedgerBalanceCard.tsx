import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { formatSignedMoney } from '@/lib/utils/formatMoney'
import { useLedgerBalance } from '../hooks/useLedgers'
import { subtractAmounts } from '../utils/money'
import { MaskedAmount } from './MaskedAmount'
import { EyeToggle } from './EyeToggle'

/**
 * Số dư của cả sổ từ ngày đầu tới nay — câu hỏi chính khi giữ tiền hộ: "tiền
 * của em còn bao nhiêu". Tổng tháng/năm không trả lời được câu đó, vì tiền gửi
 * giữ từ năm trước vẫn còn. Chỉ tính khoản đã thu/chi thật (`paid`).
 */
export function LedgerBalanceCard({ ledgerId }: { ledgerId: string }) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { data: balances = [], isLoading } = useLedgerBalance(ledgerId)

  if (isLoading) return null

  return (
    <div
      className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] px-4 py-3.5"
      style={{ borderColor: theme.accent, background: theme.chip }}
    >
      {/* Sổ chung thay thẻ "Còn được tiêu" bằng thẻ này, nên nút con mắt duy
          nhất của trang phải đi theo — không thì ở sổ chung không ẩn số được. */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-extrabold" style={{ color: theme.mutedText }}>
          {t.ledgerBalanceTitle}
        </div>
        <EyeToggle />
      </div>

      {balances.length === 0 ? (
        <div className="text-[13px] font-semibold" style={{ color: theme.mutedText }}>
          {t.ledgerBalanceEmpty}
        </div>
      ) : (
        balances.map((b) => {
          const remaining = subtractAmounts(b.income, b.expense)
          return (
            <div key={b.currency} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-extrabold" style={{ color: theme.text }}>
                  {t.ledgerBalanceRemaining}
                  {balances.length > 1 && ` (${b.currency})`}
                </span>
                <span
                  className="font-heading text-[22px] font-extrabold tabular-nums"
                  style={{ color: remaining < 0 ? theme.danger : theme.text }}
                >
                  <MaskedAmount scope="year">
                    {formatSignedMoney(remaining, b.currency, locale, 'auto')}
                  </MaskedAmount>
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-[12px] font-bold tabular-nums">
                <span style={{ color: theme.income }}>
                  {t.ledgerBalanceIn}{' '}
                  <MaskedAmount scope="year">
                    {formatSignedMoney(b.income, b.currency, locale, 'income')}
                  </MaskedAmount>
                </span>
                <span style={{ color: theme.mutedText }}>
                  {t.ledgerBalanceOut}{' '}
                  <MaskedAmount scope="year">
                    {formatSignedMoney(b.expense, b.currency, locale, 'expense')}
                  </MaskedAmount>
                </span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
