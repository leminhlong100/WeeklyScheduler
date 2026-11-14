import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GradientButton } from '@/components/common/GradientButton'
import { FormField } from '@/components/form/FormField'
import { MoneyInput } from '@/components/form/MoneyInput'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { describeError } from '@/lib/utils/errorMessage'
import { translateFieldError } from '@/lib/utils/formErrors'
import { todayISO } from '@/lib/utils/date'
import type { Currency } from '@/lib/supabase/database.types'
import type { LedgerSummary } from '../api/ledgersApi'
import { amountErrorKey, CURRENCIES, DEFAULT_CURRENCY, parseAmount } from '../schemas/expenseSchema'
import { useCreateLedgerDeposit } from '../hooks/useLedgerDeposits'
import { SheetDialog } from './SheetDialog'

const CURRENCY_LABEL = { VND: '₫ VND', JPY: '¥ JPY', USD: '$ USD' } as const

/**
 * Người được mời xem một sổ gửi yêu cầu "em đã đưa anh X". Khoản chỉ vào sổ
 * khi chủ sổ bấm "Đã nhận" (migration 0017).
 *
 * `ledgers` là các sổ được nạp vào (mình là người xem). Một sổ thì không cần
 * hỏi chọn sổ.
 */
export function DepositDialog({
  open,
  onOpenChange,
  ledgers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ledgers: LedgerSummary[]
}) {
  const { t } = useTranslation()
  return (
    <SheetDialog open={open} onOpenChange={onOpenChange} title={t.depositTitle}>
      {/* Mở lại là form mới: không giữ số tiền của lần nạp trước. */}
      {open && <DepositForm ledgers={ledgers} onDone={() => onOpenChange(false)} />}
    </SheetDialog>
  )
}

function DepositForm({ ledgers, onDone }: { ledgers: LedgerSummary[]; onDone: () => void }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const create = useCreateLedgerDeposit()
  const [ledgerId, setLedgerId] = useState(ledgers[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [submitted, setSubmitted] = useState(false)

  const amountError = submitted ? amountErrorKey(amount, currency) : null
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }

  if (ledgers.length === 0) {
    return (
      <p className="pb-6 text-[14px] font-semibold" style={{ color: theme.mutedText }}>
        {t.depositNoLedger}
      </p>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (amountErrorKey(amount, currency) || !ledgerId || !date) return
    try {
      await create.mutateAsync({
        ledgerId,
        amount: parseAmount(amount, currency),
        currency,
        note: note.trim(),
        depositedAt: date,
      })
      toast.success(t.depositSent)
      onDone()
    } catch (err) {
      toast.error(describeError(t, err))
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {ledgers.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-medium">{t.depositToLedger}</div>
          <div role="radiogroup" aria-label={t.depositToLedger} className="flex flex-wrap gap-1.5">
            {ledgers.map((l) => {
              const selected = l.id === ledgerId
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLedgerId(l.id)}
                  className="min-h-11 rounded-[12px] border-[1.5px] px-3 text-[13px] font-extrabold sm:min-h-9"
                  style={{
                    borderColor: selected ? theme.accent : theme.border,
                    background: selected ? `${theme.accent}22` : 'transparent',
                    color: selected ? theme.text : theme.mutedText,
                  }}
                >
                  {l.emoji} {l.name}
                  <span className="ml-1 font-semibold" style={{ color: theme.mutedText }}>
                    · {l.owner_name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <FormField
        label={t.expenseAmount}
        htmlFor="deposit-amount"
        error={translateFieldError(t, amountError ?? undefined)}
      >
        <MoneyInput
          id="deposit-amount"
          value={amount}
          onChange={setAmount}
          currency={currency}
          size="lg"
          showChips
          autoFocus
          invalid={!!amountError}
          placeholder={t.expenseAmountPh}
          style={inputStyle}
          chipStyle={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
        />
      </FormField>

      <div role="radiogroup" aria-label={t.expenseCurrency} className="-mt-1 flex gap-1.5">
        {CURRENCIES.map((c) => {
          const selected = currency === c
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setCurrency(c)}
              className="min-h-11 flex-1 rounded-[12px] border-[1.5px] text-[13px] font-extrabold sm:min-h-9"
              style={{
                borderColor: selected ? theme.accent : theme.border,
                background: selected ? `${theme.accent}22` : 'transparent',
                color: selected ? theme.text : theme.mutedText,
              }}
            >
              {CURRENCY_LABEL[c]}
            </button>
          )
        })}
      </div>

      <FormField label={t.expenseNote} htmlFor="deposit-note">
        <Input
          id="deposit-note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.depositNotePh}
          style={inputStyle}
        />
      </FormField>

      <FormField label={t.expenseDate} htmlFor="deposit-date">
        <Input
          id="deposit-date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          style={inputStyle}
        />
      </FormField>

      <p className="text-[12px] font-semibold" style={{ color: theme.mutedText }}>
        {t.depositHint}
      </p>

      <div
        data-sheet-footer
        className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 sm:pb-6"
        style={{ background: theme.modalBg, borderColor: theme.border }}
      >
        <Button
          size="touch"
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={create.isPending}
          style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
        >
          {t.cancel}
        </Button>
        <GradientButton type="submit" size="touch" disabled={create.isPending}>
          {t.depositSubmit}
        </GradientButton>
      </div>
    </form>
  )
}
